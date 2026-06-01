import {
  chooseHighestSeverity,
  normalizeSeverity,
  SEVERITY_RANK,
} from '../utils/severity.util.js';
import { buildAgentExecutionMetadata } from '../utils/execution-metadata.util.js';

export async function riskSummaryAgent(state) {
  const startedAt = new Date();
  const severity = aggregateSeverity(state);
  const confidence = aggregateConfidence(state);
  const reviewSummary = buildReviewSummary({
    state,
    severity,
    confidence,
  });

  return {
    reviewSummary,
    severity,
    confidence,
    executionMetadata: buildAgentExecutionMetadata({
      agentName: 'risk_summary_agent',
      startedAt,
      details: {
        severity,
        confidence,
        riskScore: state.riskScore,
        reviewDepth: state.reviewDepth,
        reviewMode: state.routeProfile?.reviewMode || 'standard',
        architectureAnalysisRan: Boolean(state.architectureAnalysis),
      },
    }),
  };
}

function aggregateSeverity(state) {
  return chooseHighestSeverity([
    state.aiReview?.riskLevel,
    state.architectureAnalysis?.architecturalRisk,
    state.validation?.summary?.highestSeverity,
    ...(state.ruleFindings || []).map(finding => finding.severity),
    ...(state.aiReview?.findings || []).map(finding => finding.severity),
    ...(state.impact?.riskSignals || []).map(signal => signal.level),
  ]);
}

function aggregateConfidence(state) {
  if (Number.isFinite(state.aiReview?.confidence)) {
    return state.aiReview.confidence;
  }

  let confidence = 72;

  if (state.context?.summary?.retrievedChunks > 0) {
    confidence += 8;
  }

  if (state.validation?.summary) {
    confidence += 5;
  }

  if (state.graph?.parseErrors?.length > 0) {
    confidence -= 10;
  }

  if (state.aiReview?.status === 'failed') {
    confidence -= 20;
  }

  if (!state.options.includeAiReview) {
    confidence -= 8;
  }

  return Math.min(95, Math.max(35, confidence));
}

function buildReviewSummary({ state, severity, confidence }) {
  const ruleFindings = state.ruleFindings || [];
  const aiFindings = state.aiReview?.findings || [];
  const riskSignals = state.impact?.riskSignals || [];
  const changedFiles = state.changedFiles || [];
  const affectedModules = state.affectedModules || [];

  return {
    phase: 'phase-6-risk-summary',
    generatedAt: new Date().toISOString(),
    severity,
    confidence,
    riskScore: state.riskScore,
    reviewMode: state.routeProfile?.reviewMode || 'standard',
    reviewDepth: state.reviewDepth,
    headline: buildHeadline({
      state,
      severity,
      ruleFindings,
      aiFindings,
      affectedModules,
    }),
    counts: {
      changedFiles: changedFiles.length,
      affectedModules: affectedModules.length,
      retrievedContextChunks: state.retrievedContext?.length || 0,
      ruleFindings: ruleFindings.length,
      aiFindings: aiFindings.length,
      riskSignals: riskSignals.length,
      architectureRisks:
        state.architectureAnalysis?.cascadingFailureRisks?.length || 0,
    },
    planner: {
      riskLevel: state.plannerDecision?.riskLevel || null,
      riskScore: state.plannerDecision?.riskScore || null,
      reviewDepth: state.plannerDecision?.reviewDepth || null,
      requiredAgents: state.executionPlan?.requiredAgents || [],
    },
    routing: {
      conditions: state.routeProfile?.conditions || {},
      rulePolicy: state.rulePolicy || {},
      executionPlan: state.executionPlan || null,
      retries: state.retries || {},
    },
    architectureAnalysis: state.architectureAnalysis,
    topFindings: buildTopFindings({ ruleFindings, aiFindings }),
    riskSignals,
    suggestedNextSteps: buildSuggestedNextSteps({
      state,
      severity,
      ruleFindings,
      aiFindings,
    }),
  };
}

function buildHeadline({
  state,
  severity,
  ruleFindings,
  aiFindings,
  affectedModules,
}) {
  if (state.aiReview?.summary) {
    return state.aiReview.summary;
  }

  const findingCount = ruleFindings.length + aiFindings.length;
  const severityLabel = normalizeSeverity(severity).toLowerCase();

  return `Graph review completed with ${severityLabel} severity, ${findingCount} findings, and ${affectedModules.length} affected modules.`;
}

function buildTopFindings({ ruleFindings, aiFindings }) {
  const normalizedRuleFindings = ruleFindings.map(finding => ({
    severity: finding.severity,
    title: finding.ruleName || finding.ruleId,
    description: finding.message,
    filePath: finding.filePath,
    line: finding.line,
    source: 'rule-engine',
  }));
  const normalizedAiFindings = aiFindings.map(finding => ({
    severity: finding.severity,
    title: finding.title,
    description: finding.description,
    filePath: finding.filePath,
    line: finding.line,
    source: finding.source || 'gemini',
  }));

  return [...normalizedRuleFindings, ...normalizedAiFindings]
    .sort((left, right) =>
      SEVERITY_RANK[normalizeSeverity(right.severity)] -
      SEVERITY_RANK[normalizeSeverity(left.severity)]
    )
    .slice(0, 10);
}

function buildSuggestedNextSteps({ state, severity, ruleFindings, aiFindings }) {
  const steps = [];

  if (['CRITICAL', 'HIGH'].includes(normalizeSeverity(severity))) {
    steps.push('Resolve high-severity findings before merge.');
  }

  if (state.routeProfile?.conditions?.authenticationFilesChanged) {
    steps.push('Run authentication, authorization, and protected-route regression tests.');
  }

  if (state.architectureAnalysis?.criticalSystemsAffected?.length) {
    steps.push(
      `Review critical systems affected by this PR: ${state.architectureAnalysis.criticalSystemsAffected
        .slice(0, 5)
        .join(', ')}.`
    );
  }

  if ((state.retries?.contextExpansion || 0) > 0) {
    steps.push('Review expanded semantic context because the first AI pass had low confidence.');
  }

  if (state.routeProfile?.conditions?.frontendOnly) {
    steps.push('Run focused React component and state-flow tests.');
  }

  if ((state.affectedModules || []).length > 0) {
    steps.push('Review affected modules that import the changed files.');
  }

  if (ruleFindings.length + aiFindings.length > 0 && steps.length === 0) {
    steps.push('Review non-blocking findings before merge.');
  }

  if (ruleFindings.length === 0 && aiFindings.length === 0) {
    steps.push('No blocking findings were detected; validate with the project test suite.');
  }

  return steps;
}
