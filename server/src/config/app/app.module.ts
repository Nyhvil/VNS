import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from '../../database/database.module';
import { AnalyzeModule } from '../../modules/analyze/analyze.module';
import { AuthModule } from '../../modules/auth/auth.module';
import { EmailAttachmentsModule } from '../../modules/email_attachments/email_attachments.module';
import { EmailLinksModule } from '../../modules/email_links/email_links.module';
import { EmailParsesModule } from '../../modules/email_parses/email_parses.module';
import { EmailReceivedChainsModule } from '../../modules/email_received_chains/email_received_chains.module';
import { ImageAnalysesModule } from '../../modules/image_analyses/image_analyses.module';
import { LlmAnalysesModule } from '../../modules/llm_analyses/llm_analyses.module';
import { NormalizedInputsModule } from '../../modules/normalized_inputs/normalized_inputs.module';
import { PipelineLogsModule } from '../../modules/pipeline_logs/pipeline_logs.module';
import { PublicPagesModule } from '../../modules/public_pages/public_pages.module';
import { PublicSectionItemsModule } from '../../modules/public_section_items/public_section_items.module';
import { PublicSectionsModule } from '../../modules/public_sections/public_sections.module';
import { RagDatasetsModule } from '../../modules/rag_datasets/rag_datasets.module';
import { RagEmbeddingsModule } from '../../modules/rag_embeddings/rag_embeddings.module';
import { RagMatchesModule } from '../../modules/rag_matches/rag_matches.module';
import { RuleDetectionsModule } from '../../modules/rule_detections/rule_detections.module';
import { ScanFeaturesModule } from '../../modules/scan_features/scan_features.module';
import { ScanRequestsModule } from '../../modules/scan_requests/scan_requests.module';
import { ScanResultsModule } from '../../modules/scan_results/scan_results.module';
import { UserAuthAccountsModule } from '../../modules/user_auth_accounts/user_auth_accounts.module';
import { UsersModule } from '../../modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    AnalyzeModule,
    AuthModule,
    UsersModule,
    UserAuthAccountsModule,
    ScanRequestsModule,
    EmailParsesModule,
    EmailReceivedChainsModule,
    EmailLinksModule,
    EmailAttachmentsModule,
    NormalizedInputsModule,
    ImageAnalysesModule,
    ScanFeaturesModule,
    RagDatasetsModule,
    RagEmbeddingsModule,
    RagMatchesModule,
    PublicPagesModule,
    PublicSectionsModule,
    PublicSectionItemsModule,
    RuleDetectionsModule,
    LlmAnalysesModule,
    ScanResultsModule,
    PipelineLogsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
