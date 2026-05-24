  import { githubService } from '../services/github.service.js';
  import { repositoryIntelligenceService } from '../services/repository/repository-intelligence.service.js';
  import { logPhase2Report } from '../utils/phase2-report.logger.js';
  import { logPhase3Report } from '../utils/phase3-report.logger.js';
  import { logPhase4Report } from '../utils/phase4-report.logger.js';
  import { logPhase5Report } from '../utils/phase5-report.logger.js';

  export const handleGithubWebhook = async (req, res) => {
    console.log('\n================ GITHUB WEBHOOK RECEIVED ================');

    try {
      const event = req.headers['x-github-event'];
      const deliveryId = req.headers['x-github-delivery'];
      const payload = req.body;

      console.log(`Event Type: ${event}`);
      console.log(`Delivery ID: ${deliveryId}`);

      if (event === 'ping') {
        console.log('GitHub webhook connected successfully.');
        return res.status(200).send('pong');
      }

      if (event === 'installation') {
        console.log(`Installation Event: ${payload.action}`);
        return res.status(200).send('Installation event received');
      }

      if (event === 'installation_repositories') {
        console.log(`Repository Installation Updated: ${payload.action}`);

        if (payload.repositories_added?.length) {
          console.log('Added repositories:');

          payload.repositories_added.forEach(repo => {
            console.log(`   - ${repo.full_name}`);
          });
        }

        if (payload.repositories_removed?.length) {
          console.log('Removed repositories:');

          payload.repositories_removed.forEach(repo => {
            console.log(`   - ${repo.full_name}`);
          });
        }

        return res.status(200).send('Repository installation updated');
      }

      if (event === 'pull_request') {
        const action = payload.action;

        console.log(`Pull Request Action: ${action}`);

        if (['opened', 'synchronize', 'reopened'].includes(action)) {
          const pr = payload.pull_request;
          const repo = payload.repository;
          const installationId = payload.installation?.id;

          console.log('\nPR EVENT DETECTED');
          console.log(`Repository: ${repo.full_name}`);
          console.log(`PR Number: #${pr.number}`);
          console.log(`Title: ${pr.title}`);
          console.log(`Author: ${pr.user.login}`);

          if (!installationId) {
            console.warn('Missing installation ID');
            return res.status(200).send('Ignored');
          }

          processPullRequest({
            installationId,
            owner: repo.owner.login,
            repo: repo.name,
            pullNumber: pr.number,
            headSha: pr.head?.sha,
          }).catch(error => {
            console.error('Async PR processing failed:', error);
          });
        }

        return res.status(200).send('Pull request event received');
      }

      console.log(`Ignored Event: ${event}`);

      return res.status(200).send('Event ignored');
    } catch (error) {
      console.error('\nWEBHOOK ERROR');
      console.error(error);

      return res.status(500).send('Internal Server Error');
    }
  };

  async function processPullRequest({
    installationId,
    owner,
    repo,
    pullNumber,
    headSha,
  }) {
    try {
      console.log(`\nFetching changed files for ${owner}/${repo}#${pullNumber}`);

      const files = await githubService.getPRFiles(
        installationId,
        owner,
        repo,
        pullNumber
      );

      console.log(`\nFound ${files.length} changed files:\n`);

      files.forEach(file => {
        console.log(
          `- [${file.status}] ${file.filename} (+${file.additions} / -${file.deletions})`
        );
      });

      console.log('\nStarting Phase 2 repository intelligence analysis...');

      const phase2Report = await repositoryIntelligenceService.analyzePullRequest({
        installationId,
        owner,
        repo,
        ref: headSha,
        changedFiles: files,
        includeRuleValidation: true,
        includeAiReview: true,
        failOnAiReviewError: false,
      });

      logPhase2Report(phase2Report);
      logPhase3Report(phase2Report);
      logPhase4Report(phase2Report);
      logPhase5Report(phase2Report);
    } catch (error) {
      console.error('\nError processing pull request');
      console.error(error);
    }
  }
