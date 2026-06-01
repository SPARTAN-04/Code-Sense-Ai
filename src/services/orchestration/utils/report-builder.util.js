export function buildPhase6Report(finalState) {
  const completedAt = new Date().toISOString();
  const startedAt = finalState.executionMetadata?.startedAt;

  return {
    phase: 'phase-6-langgraph-orchestration',
    status: buildStatus(finalState),
    generatedAt: completedAt,
    repository: finalState.repository,
    changedFiles: finalState.changedFiles,
    scan: finalState.scanResult?.summary || {},
    graph: finalState.dependencyGraph || {},
    impact: finalState.impact || {
      changedFiles: [],
      affectedModules: [],
      propagationChains: [],
      riskSignals: [],
      summary: {},
    },
    context: finalState.context,
    validation: finalState.validation,
    aiReview: finalState.aiReview,
    reviewSummary: finalState.reviewSummary,
    severity: finalState.severity,
    confidence: finalState.confidence,
    riskScore: finalState.riskScore,
    reviewDepth: finalState.reviewDepth,
    plannerDecision: finalState.plannerDecision,
    executionPlan: finalState.executionPlan,
    architectureAnalysis: finalState.architectureAnalysis,
    retries: finalState.retries,
    executionMetadata: {
      ...(finalState.executionMetadata || {}),
      completedAt,
      totalDurationMs: startedAt
        ? new Date(completedAt).getTime() - new Date(startedAt).getTime()
        : null,
      routeProfile: finalState.routeProfile,
      plannerDecision: finalState.plannerDecision,
      executionPlan: finalState.executionPlan,
      retries: finalState.retries,
    },
  };
}

function buildStatus(finalState) {
  if (finalState.aiReview?.status === 'failed') {
    return 'completed-with-ai-review-failure';
  }

  if (finalState.executionMetadata?.errors?.length) {
    return 'completed-with-errors';
  }

  return 'completed';
}
