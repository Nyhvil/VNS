import {
  AnalysisRequest,
  AnalysisResponse,
  Finding,
  Evidence,
  DetectionResults,
  RagResult,
  RuleResult,
  LlmResult,
  MlResult,
  Category,
  ParsedContent,
  FeatureSet,
  LayerScore,
} from '../types';
import { parseInput } from '../parser/input-parser';
import { extractFeatures } from '../features/feature-extractor';
import { evaluateRules } from '../rules/rule-engine';
import { analyzeWithRag, storeContentToVectorDb } from '../rag/rag-analyzer';
import type { StoredLabel } from '../rag/rag-analyzer';
import { analyzeWithLlm } from '../llm/llm-analyzer';
import { classifyWithMl, ML_UNAVAILABLE } from '../ml/ml-client';
import { aggregateScores, computeWeightedScore } from '../scoring/score-aggregator';
import { LAYER_WEIGHTS } from '../scoring/weights';
import { mapToRiskLevel } from '../scoring/risk-level-mapper';
import { computeImageRiskScore } from '../scoring/image-risk';
import { buildVnsVerdict } from '../scoring/vns-verdict';
import { getConfig } from '../config/config';
import { getLlmEndpoint } from '../config/ai-endpoints';
import { logAnalysisReceived, logAnalysisCompleted, logLayerError } from '../logger/logger';
import { generateHash } from '../cache/cache-manager';
import { getCachedAnalysis, setCachedAnalysis } from '../cache/shared-cache';
import { isQueueRunning, runAnalysisJob, enqueueVectorStore } from '../queue/analysis-queue';

const EMPTY_RULE_RESULT: RuleResult = { violations: [], score: 0 };
const EMPTY_RAG_RESULT: RagResult = { matches: [], top_score: 0, score: 0 };
const EMPTY_LLM_RESULT: LlmResult = { explanation: '', score: 0, enabled: false };

/** Confidence the ML classifier needs before its verdict is returned directly. */
const DEFAULT_ML_CONFIDENCE_THRESHOLD = 0.9;

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

  if (config.cacheEnabled) {
    const cachedResponse = await getCachedAnalysis<AnalysisResponse>(
      cacheKey,
      config.cacheTtlMs,
      config.cacheMaxSize
    );
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

  let result: AnalysisResponse;

  if (isQueueRunning()) {
    // Redis is configured: the request waits its turn on the BullMQ queue.
    result = await runAnalysisJob(request, config.pipelineTimeoutMs);
  } else {
    const analysisPromise = performAnalysis(request, config);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Analysis timeout')), config.pipelineTimeoutMs)
    );
    result = await Promise.race([analysisPromise, timeoutPromise]);
  }

  const duration = Date.now() - startTime;

  logAnalysisCompleted({
    job_id: request.job_id,
    risk_score: result.risk_score,
    risk_level: result.risk_level,
    category: result.category,
    duration_ms: duration,
    layers_used: describeLayersUsed(result),
  });

  if (config.cacheEnabled) {
    await setCachedAnalysis(cacheKey, result, config.cacheTtlMs, config.cacheMaxSize);
  }

  return result;
}

function describeLayersUsed(result: AnalysisResponse): string[] {
  if (result.layers && result.layers.length > 0) {
    const used: string[] = result.layers.filter(l => l.applied).map(l => l.id);
    if (!used.includes('rule')) used.unshift('rule');
    if (result.analysis_path === 'fast_ml') used.push('ml_fast_path');
    return used;
  }

  const used: string[] = ['rule'];
  if (result.evidence.rag_matches.length > 0) used.push('rag');
  if (typeof result.llm_score === 'number') used.push('llm');
  return used;
}

function buildEvidence(content: ParsedContent, features: FeatureSet, ragResult: RagResult): Evidence {
  const evidence: Evidence = {
    headers: 'headers' in content ? content.headers : {},
    urls: features.urls,
    keywords: features.suspicious_keywords,
    rag_matches: ragResult.matches,
  };

  if (features.knowledge) {
    evidence.url_checks = features.knowledge.urls;
    evidence.entities = features.knowledge.entities;
    evidence.scam_patterns = features.knowledge.patterns;
  }
  if ('qr_codes' in content && content.qr_codes && content.qr_codes.length > 0) {
    evidence.qr_codes = content.qr_codes;
  }

  return evidence;
}

/**
 * Hybrid routing: when the classifier is very sure, its verdict is returned
 * directly and the slower RAG and LLM steps are skipped.
 *
 * A confident "safe" is only trusted when no other check objects. If a rule
 * fired or an email header failed, the content takes the full analysis.
 */
function canTakeFastPath(
  ml: MlResult,
  ruleResult: RuleResult,
  headerScore: number,
  imageRisk: number,
  threshold: number
): boolean {
  if (!ml.available || !ml.label) return false;
  if (ml.confidence < threshold) return false;

  if (ml.label === 'scam') return true;

  return ruleResult.violations.length === 0 && headerScore === 0 && imageRisk === 0;
}

function scheduleVectorStore(content: ParsedContent, jobId: string, score: number, label: StoredLabel): void {
  const storeDirectly = () =>
    storeContentToVectorDb(content, jobId, score, label).catch(err => {
      logLayerError({
        job_id: jobId,
        layer_name: 'orchestrator_background_store',
        error_message: `Background storeContentToVectorDb failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    });

  if (!isQueueRunning()) {
    void storeDirectly();
    return;
  }

  enqueueVectorStore({ content, jobId, score, label })
    .then(queued => {
      if (!queued) void storeDirectly();
    })
    .catch(() => {
      void storeDirectly();
    });
}

/** The full analysis of one request, without cache, queue or overall timeout. */
/** In confident mode, scores from here up (SCAM level) do not wait for the LLM. */
export const CONFIDENT_SCAM_SCORE = 80;

export async function performAnalysis(
  request: AnalysisRequest,
  config: ReturnType<typeof getConfig> = getConfig()
): Promise<AnalysisResponse> {
  // Step 1: Parse input (email, plain text, or image through OCR)
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

  const content = parseResult.content;
  const extractedText = request.type === 'image' ? content.body : undefined;

  // Step 2: Extract features, including the checks against the knowledge base
  const features = extractFeatures(content);

  // Step 3: Rule engine
  let ruleResult: RuleResult = EMPTY_RULE_RESULT;
  try {
    ruleResult = evaluateRules(features);
  } catch (ruleError) {
    logLayerError({ job_id: request.job_id, layer_name: 'rule', error_message: String(ruleError) });
  }

  // Step 4: Header and image scores
  const headerScore = computeHeaderScore(features);
  const imageRisk = computeImageRiskScore(content);

  // Step 5: ML classifier (PhoBERT / DistilBERT), when the ML service is configured
  const ml: MlResult = config.mlServiceUrl
    ? await classifyWithMl(content.body, request.job_id)
    : ML_UNAVAILABLE;

  const mlThreshold = config.mlConfidenceThreshold ?? DEFAULT_ML_CONFIDENCE_THRESHOLD;

  if (canTakeFastPath(ml, ruleResult, headerScore, imageRisk, mlThreshold)) {
    return buildFastPathResponse(request, content, features, ruleResult, headerScore, imageRisk, ml, extractedText);
  }

  // Step 6: Deep path. Similarity search against known scam samples (RAG).
  let ragResult: RagResult = EMPTY_RAG_RESULT;
  let ragFinding: Finding | null = null;
  try {
    const rag = await analyzeWithRag(content, request.job_id);
    ragResult = rag.result;
    ragFinding = rag.finding;
  } catch (ragError) {
    logLayerError({ job_id: request.job_id, layer_name: 'rag', error_message: String(ragError) });
  }

  // Step 7: LLM reasoning, given everything the other layers found
  const llmCanRun = config.llmEnabled && !!getLlmEndpoint(config).apiKey;

  // gray_zone mode asks the LLM only when the other layers are undecided.
  const preliminaryScore =
    LAYER_WEIGHTS.rag * ragResult.score +
    LAYER_WEIGHTS.rule * ruleResult.score +
    LAYER_WEIGHTS.header * headerScore +
    LAYER_WEIGHTS.image * parseResult.imageScore;

  // confident mode skips the LLM only when the other layers already agree the
  // content is a scam (same formula as the final score, without the LLM). Low
  // scores still go to the LLM: new kinds of scams often trip no rule at all.
  const scoreWithoutLlm = () =>
    computeWeightedScore(
      { rule: ruleResult, rag: ragResult, llm: EMPTY_LLM_RESULT, header_score: headerScore, image_score: imageRisk },
      { ragThreshold: config.ragSimilarityThreshold }
    );

  const shouldCallLlm =
    llmCanRun &&
    (config.llmMode === 'always' ||
      (config.llmMode === 'confident'
        ? scoreWithoutLlm() < CONFIDENT_SCAM_SCORE
        : preliminaryScore >= 15 && preliminaryScore < 75));

  let llmResult: LlmResult = EMPTY_LLM_RESULT;

  if (shouldCallLlm) {
    try {
      llmResult = await analyzeWithLlm(content, features, request.job_id, {
        ragMatches: ragResult.matches,
        ml,
      });
      // Older analyzers do not say whether they succeeded; a non-empty answer counts.
      if (llmResult.enabled && llmResult.succeeded === undefined) {
        llmResult = { ...llmResult, succeeded: llmResult.explanation !== '' || llmResult.score > 0 };
      }
    } catch (llmError) {
      logLayerError({
        job_id: request.job_id,
        layer_name: 'llm',
        error_message: String(llmError),
      });
    }
  }

  // Step 8: Aggregate scores
  const detectionResults: DetectionResults = {
    rule: ruleResult,
    rag: ragResult,
    llm: llmResult,
    header_score: headerScore,
    image_score: imageRisk,
  };

  const aggregated = aggregateScores(detectionResults, {
    ragThreshold: config.ragSimilarityThreshold,
  });

  // Step 9: Build findings and evidence
  const allFindings: Finding[] = [
    ...ruleResult.violations,
    ...(ragFinding ? [ragFinding] : []),
  ];

  const evidence = buildEvidence(content, features, ragResult);

  const recommendation = buildRecommendation(
    llmResult.explanation,
    allFindings,
    ragResult,
    aggregated.category
  );

  // Content becomes a "known phishing" sample for later comparisons only when
  // a rule flagged it independently. Content that is phishing merely because
  // it resembles an existing sample is kept under a separate label, otherwise
  // the sample set would drift a little further with every near-match.
  const hasHighSeverityRule = ruleResult.violations.some(
    v => v.severity === 'high' || v.severity === 'critical'
  );
  const storedLabel: StoredLabel =
    aggregated.category === 'phishing' && !hasHighSeverityRule
      ? 'phishing_similar'
      : aggregated.category;

  scheduleVectorStore(content, request.job_id, aggregated.risk_score, storedLabel);

  const vns = buildVnsVerdict({
    riskScore: aggregated.risk_score,
    path: 'deep',
    findings: allFindings,
    features,
    ragResult,
    llm: llmResult,
    ml,
    extractedText,
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
    analysis_path: 'deep',
    layers: aggregated.layers,
    formula_score: aggregated.formula_score,
    llm_floor_applied: aggregated.llm_floor_applied,
    ...(ml.available ? { ml } : {}),
    vns,
  };
}

function buildFastPathResponse(
  request: AnalysisRequest,
  content: ParsedContent,
  features: FeatureSet,
  ruleResult: RuleResult,
  headerScore: number,
  imageRisk: number,
  ml: MlResult,
  extractedText: string | undefined
): AnalysisResponse {
  const riskScore = Math.round(Math.min(1, Math.max(0, ml.scam_probability)) * 100);
  const isScam = ml.label === 'scam';
  const category: Category = isScam ? 'phishing' : 'safe';

  // The layers are reported for transparency, but none of them decided this score.
  const layers: LayerScore[] = aggregateScores({
    rule: ruleResult,
    rag: EMPTY_RAG_RESULT,
    llm: EMPTY_LLM_RESULT,
    header_score: headerScore,
    image_score: imageRisk,
  }).layers ?? [];

  const hasHighSeverityRule = ruleResult.violations.some(
    v => v.severity === 'high' || v.severity === 'critical'
  );
  const storedLabel: StoredLabel = isScam ? (hasHighSeverityRule ? 'phishing' : 'phishing_ml') : 'safe';
  scheduleVectorStore(content, request.job_id, riskScore, storedLabel);

  const vns = buildVnsVerdict({
    riskScore,
    path: 'fast_ml',
    findings: ruleResult.violations,
    features,
    ml,
    extractedText,
  });

  return {
    job_id: request.job_id,
    status: 'completed',
    risk_score: riskScore,
    risk_level: mapToRiskLevel(riskScore),
    category,
    findings: ruleResult.violations,
    evidence: buildEvidence(content, features, EMPTY_RAG_RESULT),
    recommendation: vns.explanation,
    rule_score: ruleResult.score,
    header_score: headerScore,
    image_score: imageRisk,
    analysis_path: 'fast_ml',
    layers,
    ml,
    vns,
  };
}

function computeHeaderScore(features: ReturnType<typeof extractFeatures>): number {
  let score = 0;
  if (features.spf_result === 'fail') score += 40;
  if (features.dkim_result === 'fail') score += 40;
  if (features.domain_mismatch) score += 20;
  return Math.min(100, score);
}
