import {
  AnalysisRequest,
  AnalysisResponse,
  Finding,
  Evidence,
  DetectionResults,
  RagResult,
  RuleResult,
  LlmResult,
  Category,
} from '../types';
import { parseInput } from '../parser/input-parser';
import { extractFeatures } from '../features/feature-extractor';
import { evaluateRules } from '../rules/rule-engine';
import { analyzeWithRag, storeContentToVectorDb } from '../rag/rag-analyzer';
import { analyzeWithLlm } from '../llm/llm-analyzer';
import { aggregateScores } from '../scoring/score-aggregator';
import { getConfig } from '../config/config';
import { logAnalysisReceived, logAnalysisCompleted, logLayerError } from '../logger/logger';
import { getAnalysisCache, generateHash } from '../cache/cache-manager';

const EMPTY_RULE_RESULT: RuleResult = { violations: [], score: 0 };
const EMPTY_RAG_RESULT: RagResult = { matches: [], top_score: 0, score: 0 };
const EMPTY_LLM_RESULT: LlmResult = { explanation: '', score: 0, enabled: false };

function buildRecommendation(
  llmExplanation: string,
  violations: Finding[],
  ragResult: RagResult,
  category: Category
): string {
  if (llmExplanation) return llmExplanation;

  if (category === 'safe') {
    return 'No phishing indicators detected. This content appears safe.';
  }

  const parts: string[] = [];

  if (ragResult.top_score > 0.75) {
    parts.push(`Content is ${(ragResult.top_score * 100).toFixed(0)}% similar to known phishing emails.`);
  }

  const highViolations = violations.filter(v => v.severity === 'high' || v.severity === 'critical');
  if (highViolations.length > 0) {
    parts.push(`High-severity indicators: ${highViolations.map(v => v.rule_id).join(', ')}.`);
  }

  if (parts.length === 0 && violations.length > 0) {
    parts.push(`${violations.length} suspicious indicator(s) detected.`);
  }

  parts.push('Exercise caution before clicking links or providing personal information.');

  return parts.join(' ');
}

export async function runAnalysis(request: AnalysisRequest): Promise<AnalysisResponse> {
  const config = getConfig();
  const startTime = Date.now();

  logAnalysisReceived({
    job_id: request.job_id,
    input_type: request.type,
    request_size_bytes: Buffer.byteLength(request.content, 'utf8'),
  });

  const cacheKey = generateHash(`${request.type}:${request.content}`);
  const analysisCache = getAnalysisCache(config.cacheTtlMs, config.cacheMaxSize);

  if (config.cacheEnabled) {
    const cachedResponse = analysisCache.get(cacheKey);
    if (cachedResponse) {
      const duration = Date.now() - startTime;
      const cachedResult = {
        ...cachedResponse,
        job_id: request.job_id, // Maintain request's specific job_id
      };
      
      logAnalysisCompleted({
        job_id: request.job_id,
        risk_score: cachedResult.risk_score,
        risk_level: cachedResult.risk_level,
        category: cachedResult.category,
        duration_ms: duration,
        layers_used: ['cache'],
      });
      
      return cachedResult;
    }
  }

  const analysisPromise = performAnalysis(request, config);
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Analysis timeout')), config.pipelineTimeoutMs)
  );

  const result = await Promise.race([analysisPromise, timeoutPromise]);

  const duration = Date.now() - startTime;
  
  // Determine actual layers utilized in this execution
  const layersUsed: string[] = ['rule'];
  if (result.evidence.rag_matches.length > 0) layersUsed.push('rag');
  if (result.recommendation && 
      result.recommendation !== 'No phishing indicators detected. This content appears safe.' && 
      !result.recommendation.includes('similar to known phishing') &&
      !result.recommendation.includes('suspicious indicator')) {
    layersUsed.push('llm');
  }

  logAnalysisCompleted({
    job_id: request.job_id,
    risk_score: result.risk_score,
    risk_level: result.risk_level,
    category: result.category,
    duration_ms: duration,
    layers_used: layersUsed,
  });

  if (config.cacheEnabled) {
    analysisCache.set(cacheKey, result);
  }

  return result;
}

async function performAnalysis(
  request: AnalysisRequest,
  config: ReturnType<typeof getConfig>
): Promise<AnalysisResponse> {
  // Step 1: Parse input
  const parseResult = await parseInput(request);

  // Handle unreadable image
  if (parseResult.ocrFailed) {
    return {
      job_id: request.job_id,
      status: 'completed',
      risk_score: 0,
      risk_level: 'low',
      category: 'unreadable_image',
      findings: [
        {
          rule_id: 'ocr_failure',
          severity: 'low',
          description: 'Image could not be processed by OCR — content is unreadable',
          evidence: {},
        },
      ],
      evidence: { headers: {}, urls: [], keywords: [], rag_matches: [] },
      recommendation: 'The image could not be analyzed. Please provide a text version of the content.',
    };
  }

  // Step 2: Extract features
  const features = extractFeatures(parseResult.content);

  // Step 3: Run fast detection layers (Rules & RAG) in parallel
  const [ruleSettled, ragSettled] = await Promise.allSettled([
    Promise.resolve(evaluateRules(features)),
    analyzeWithRag(parseResult.content, request.job_id),
  ]);

  const ruleResult: RuleResult =
    ruleSettled.status === 'fulfilled' ? ruleSettled.value : EMPTY_RULE_RESULT;

  if (ruleSettled.status === 'rejected') {
    logLayerError({
      job_id: request.job_id,
      layer_name: 'rule',
      error_message: String(ruleSettled.reason),
    });
  }

  const { result: ragResult, finding: ragFinding } =
    ragSettled.status === 'fulfilled'
      ? ragSettled.value
      : { result: EMPTY_RAG_RESULT, finding: null };

  if (ragSettled.status === 'rejected') {
    logLayerError({
      job_id: request.job_id,
      layer_name: 'rag',
      error_message: String(ragSettled.reason),
    });
  }

  // Step 4: Compute header score from email features
  const headerScore = computeHeaderScore(features);

  // Step 5: Evaluate Early Exit / LLM-on-demand based on preliminary score
  const preliminaryScore = 
    0.35 * ragResult.score +
    0.25 * ruleResult.score +
    0.20 * headerScore +
    0.10 * parseResult.imageScore;

  let llmResult: LlmResult = EMPTY_LLM_RESULT;
  
  // Call LLM only if score falls in suspicious intermediate "gray zone" (15 to 74)
  const shouldCallLlm = 
    config.llmEnabled && 
    !!config.openaiApiKey && 
    preliminaryScore >= 15 && 
    preliminaryScore < 75;

  if (shouldCallLlm) {
    try {
      llmResult = await analyzeWithLlm(parseResult.content, features, request.job_id);
    } catch (llmError) {
      logLayerError({
        job_id: request.job_id,
        layer_name: 'llm',
        error_message: String(llmError),
      });
    }
  }

  // Step 6: Aggregate scores
  const detectionResults: DetectionResults = {
    rule: ruleResult,
    rag: ragResult,
    llm: llmResult,
    header_score: headerScore,
    image_score: parseResult.imageScore,
  };

  const aggregated = aggregateScores(detectionResults);

  // Step 7: Build findings and evidence
  const allFindings: Finding[] = [
    ...ruleResult.violations,
    ...(ragFinding ? [ragFinding] : []),
  ];

  const evidence: Evidence = {
    headers: 'headers' in parseResult.content ? parseResult.content.headers : {},
    urls: features.urls,
    keywords: features.suspicious_keywords,
    rag_matches: ragResult.matches,
  };

  const recommendation = buildRecommendation(
    llmResult.explanation,
    allFindings,
    ragResult,
    aggregated.category
  );

  // Background storage to VectorDB
  // Content becomes a "known phishing" sample for later comparisons only when
  // a rule flagged it independently. Content that is phishing merely because
  // it resembles an existing sample is kept under a separate label, otherwise
  // the sample set would drift a little further with every near-match.
  const hasHighSeverityRule = ruleResult.violations.some(
    v => v.severity === 'high' || v.severity === 'critical'
  );
  const storedLabel: Category | 'phishing_similar' =
    aggregated.category === 'phishing' && !hasHighSeverityRule
      ? 'phishing_similar'
      : aggregated.category;

  storeContentToVectorDb(
    parseResult.content,
    request.job_id,
    aggregated.risk_score,
    storedLabel
  ).catch(err => {
    logLayerError({
      job_id: request.job_id,
      layer_name: 'orchestrator_background_store',
      error_message: `Background storeContentToVectorDb failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  });

  return {
    job_id: request.job_id,
    status: 'completed',
    risk_score: aggregated.risk_score,
    risk_level: aggregated.risk_level,
    category: aggregated.category,
    findings: allFindings,
    evidence,
    recommendation,
    rag_score: detectionResults.rag.score,
    rule_score: detectionResults.rule.score,
    header_score: detectionResults.header_score,
    image_score: detectionResults.image_score,
    llm_score: shouldCallLlm ? detectionResults.llm.score : undefined,
  };
}

function computeHeaderScore(features: ReturnType<typeof extractFeatures>): number {
  let score = 0;
  if (features.spf_result === 'fail') score += 40;
  if (features.dkim_result === 'fail') score += 40;
  if (features.domain_mismatch) score += 20;
  return Math.min(100, score);
}
