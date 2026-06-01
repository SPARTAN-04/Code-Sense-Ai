export function logPhase6Report(report) {
  if (!report?.reviewSummary) {
    console.log('\nPhase 6 orchestration summary was not generated.');
    return;
  }

  const summary = report.reviewSummary;
  const metadata = report.executionMetadata || {};
  const routeProfile = metadata.routeProfile || {};

  console.log('\n================ PHASE 6 LANGGRAPH ORCHESTRATION ================');
  console.log(`Workflow status: ${report.status}`);
  console.log(`Review depth: ${summary.reviewDepth || report.reviewDepth || 'STANDARD'}`);
  console.log(`Review mode: ${summary.reviewMode}`);
  console.log(`Risk score: ${summary.riskScore ?? report.riskScore ?? 0}`);
  console.log(`Final severity: ${summary.severity}`);
  console.log(`Confidence: ${summary.confidence}%`);
  console.log(`Total duration: ${metadata.totalDurationMs || 0}ms`);

  if (report.executionPlan?.requiredAgents?.length) {
    console.log(
      `Execution plan: ${report.executionPlan.requiredAgents.join(' -> ')}`
    );
  }

  console.log('\nRouting decisions:');
  printRoutingCondition('Frontend-only PR', routeProfile.conditions?.frontendOnly);
  printRoutingCondition('Backend-only PR', routeProfile.conditions?.backendOnly);
  printRoutingCondition(
    'Authentication-sensitive change',
    routeProfile.conditions?.authenticationFilesChanged
  );
  printRoutingCondition('Broad impact', routeProfile.conditions?.broadImpact);

  if (routeProfile.rulePolicy?.excludedRuleCategories?.length) {
    console.log(
      `- Skipped rule categories: ${routeProfile.rulePolicy.excludedRuleCategories.join(', ')}`
    );
  } else {
    console.log('- Skipped rule categories: none');
  }

  if (report.retries?.contextExpansion) {
    console.log(
      `- Context expansion retries: ${report.retries.contextExpansion}`
    );
  }

  if (report.architectureAnalysis) {
    console.log(
      `- Architecture risk: ${report.architectureAnalysis.architecturalRisk}`
    );
    console.log(
      `- Critical systems: ${
        report.architectureAnalysis.criticalSystemsAffected?.join(', ') || 'none'
      }`
    );
  }

  console.log('\nAgent execution:');
  const agentRuns = metadata.agentRuns?.length
    ? metadata.agentRuns
    : Object.entries(metadata.agents || {}).map(([agentName, agent]) => ({
        agentName,
        ...agent,
      }));

  agentRuns.forEach(agent => {
    console.log(
      `- ${agent.agentName}: ${agent.status} (${agent.durationMs || 0}ms)`
    );
  });

  if (metadata.warnings?.length) {
    console.log('\nWarnings:');
    metadata.warnings.forEach(warning => {
      console.log(`- ${warning}`);
    });
  }

  console.log('\nSummary:');
  console.log(summary.headline);

  console.log('\nCounts:');
  Object.entries(summary.counts || {}).forEach(([name, count]) => {
    console.log(`- ${name}: ${count}`);
  });

  console.log('\nSuggested next steps:');
  if (!summary.suggestedNextSteps?.length) {
    console.log('- none');
  } else {
    summary.suggestedNextSteps.forEach(step => {
      console.log(`- ${step}`);
    });
  }

  console.log('\nPhase 6 complete: multi-agent graph orchestration finished.');
}

function printRoutingCondition(label, value) {
  console.log(`- ${label}: ${Boolean(value)}`);
}
