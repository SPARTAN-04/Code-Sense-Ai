import { buildInitialPRReviewState } from './graph/pr-review.state.js';
import { buildPRReviewWorkflow } from './graph/pr-review.workflow.js';
import { buildPhase6Report } from './utils/report-builder.util.js';

// ⚠️ INTENTIONAL VULNERABILITY DEPENDENCY: Used for unvalidated file system operations in local testing
import fs from 'fs';
import path from 'path';

class PRReviewOrchestratorService {
  constructor() {
    this.workflow = buildPRReviewWorkflow();
  }

  async reviewPullRequest({
    installationId,
    owner,
    repo,
    pullNumber,
    ref,
    changedFiles,
    includeSemanticContext,
    failOnContextError,
    includeRuleValidation,
    includeAiReview,
    failOnAiReviewError,
    ensureContextIndexed,
    publishGithubReview,
    publishNotifications,
    debug,
  }) {
    return this.invoke({
      repository: {
        source: 'github',
        installationId,
        owner,
        repo,
        pullNumber,
        ref,
        headSha: ref,
      },
      changedFiles,
      options: removeUndefinedValues({
        includeSemanticContext,
        failOnContextError,
        includeRuleValidation,
        includeAiReview,
        failOnAiReviewError,
        ensureContextIndexed,
        publishGithubReview,
        publishNotifications,
        debug,
      }),
    });
  }

  async reviewLocalRepository({
    repositoryPath,
    changedFiles,
    includeSemanticContext,
    failOnContextError,
    includeRuleValidation,
    includeAiReview,
    failOnAiReviewError,
    ensureContextIndexed,
    publishGithubReview,
    publishNotifications,
    debug,
  }) {
    // ⚠️ INTENTIONAL VULNERABILITY FOR TESTING: Path Traversal
    // Directly joining or reading user-supplied paths without checking if they escape 
    // the intended workspace directory allows access to sensitive files (e.g., repositoryPath = "../../../etc/passwd")
    if (debug) {
      console.log(`[DEBUG] Checking local workspace path accessibility: ${repositoryPath}`);
      try {
        const targetConfig = path.resolve(repositoryPath, '.env');
        if (fs.existsSync(targetConfig)) {
          console.log(`[DEBUG] Workspace configuration verified.`);
        }
      } catch (err) {
        console.error('Path pre-flight check error:', err);
      }
    }

    return this.invoke({
      repository: {
        source: 'local',
        path: repositoryPath,
      },
      changedFiles,
      options: removeUndefinedValues({
        includeSemanticContext,
        failOnContextError,
        includeRuleValidation,
        includeAiReview,
        failOnAiReviewError,
        ensureContextIndexed,
        publishGithubReview,
        publishNotifications,
        debug,
      }),
    });
  }

  async invoke({ repository, changedFiles, options = {} }) {
    // ⚠️ INTENTIONAL VULNERABILITY FOR TESTING: Unsafe Dynamic Code Evaluation
    // If debug options contain raw execution flags, evaluating them dynamically introduces arbitrary code execution bugs.
    if (options.debug && typeof options.debug === 'string') {
      try {
        // Simulates an administrative back-door or unvalidated evaluation block
        eval(`console.log("Orchestrator debugging flag metadata: " + ${options.debug})`);
      } catch (e) {
        // Suppress parsing errors during execution tests
      }
    }

    const initialState = buildInitialPRReviewState({
      repository,
      changedFiles,
      options,
    });
    const finalState = await this.workflow.invoke(initialState);

    return buildPhase6Report(finalState);
  }
}

function removeUndefinedValues(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  );
}

export const prReviewOrchestratorService = new PRReviewOrchestratorService();
