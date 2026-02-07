#!/usr/bin/env node

/**
 * CI/CD Pipeline Test Script
 *
 * This script validates that the CI/CD pipeline is properly configured
 * and can run successfully. It checks all the workflow files,
 * configurations, and dependencies.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const COLORS = {
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  RESET: '\x1b[0m',
};

function log(message, color = COLORS.RESET) {
  console.log(`${color}${message}${COLORS.RESET}`);
}

function checkFile(filePath, description) {
  try {
    if (fs.existsSync(filePath)) {
      log(`✅ ${description}`, COLORS.GREEN);
      return true;
    } else {
      log(`❌ ${description} - File not found: ${filePath}`, COLORS.RED);
      return false;
    }
  } catch (error) {
    log(`❌ ${description} - Error: ${error.message}`, COLORS.RED);
    return false;
  }
}

function validateYAML(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // Basic YAML validation checks
    const checks = [
      { test: content.includes('name:'), message: 'Has workflow name' },
      { test: content.includes('on:'), message: 'Has trigger configuration' },
      { test: content.includes('jobs:'), message: 'Has jobs defined' },
    ];

    let allPassed = true;
    checks.forEach(({ test, message }) => {
      if (test) {
        log(`  ✅ ${message}`, COLORS.GREEN);
      } else {
        log(`  ❌ ${message}`, COLORS.RED);
        allPassed = false;
      }
    });

    return allPassed;
  } catch (error) {
    log(`❌ Error validating ${filePath}: ${error.message}`, COLORS.RED);
    return false;
  }
}

function checkDependencies() {
  log('\n📦 Checking package.json scripts...', COLORS.BLUE);

  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const scripts = packageJson.scripts || {};

    const requiredScripts = [
      'test',
      'test:unit',
      'test:integration',
      'test:e2e',
      'lint',
      'format:check',
      'type-check',
      'build',
      'build:web',
      'build:cli',
      'build:gateway',
      'build:agents',
    ];

    let allScriptsPresent = true;
    requiredScripts.forEach(script => {
      if (scripts[script]) {
        log(`  ✅ ${script}`, COLORS.GREEN);
      } else {
        log(`  ❌ Missing script: ${script}`, COLORS.RED);
        allScriptsPresent = false;
      }
    });

    return allScriptsPresent;
  } catch (error) {
    log(`❌ Error checking package.json: ${error.message}`, COLORS.RED);
    return false;
  }
}

function checkEnvironmentFiles() {
  log('\n🔧 Checking environment configuration...', COLORS.BLUE);

  const envFiles = [
    { path: '.env.example', description: 'Environment example' },
    { path: '.env.test', description: 'Test environment' },
    { path: 'docker-compose.yml', description: 'Docker Compose configuration' },
    {
      path: 'docker-compose.test.yml',
      description: 'Test Docker Compose configuration',
    },
  ];

  return envFiles.every(({ path: filePath, description }) =>
    checkFile(filePath, description)
  );
}

function checkRequiredTools() {
  log('\n🛠️  Checking required tools...', COLORS.BLUE);

  const tools = [
    { command: 'node --version', description: 'Node.js' },
    { command: 'pnpm --version', description: 'pnpm' },
    { command: 'docker --version', description: 'Docker' },
    { command: 'docker-compose --version', description: 'Docker Compose' },
  ];

  let allToolsAvailable = true;
  tools.forEach(({ command, description }) => {
    try {
      execSync(command, { stdio: 'ignore' });
      log(`  ✅ ${description}`, COLORS.GREEN);
    } catch (error) {
      log(`  ❌ ${description} not available`, COLORS.RED);
      allToolsAvailable = false;
    }
  });

  return allToolsAvailable;
}

function checkWorkflowFiles() {
  log('\n🔄 Checking GitHub workflow files...', COLORS.BLUE);

  const workflows = [
    { file: '.github/workflows/ci.yml', description: 'CI Pipeline' },
    {
      file: '.github/workflows/deploy.yml',
      description: 'Deployment Pipeline',
    },
    {
      file: '.github/workflows/security.yml',
      description: 'Security Scanning',
    },
    {
      file: '.github/workflows/performance.yml',
      description: 'Performance Testing',
    },
    { file: '.github/workflows/release.yml', description: 'Release Pipeline' },
    { file: '.github/workflows/codeql.yml', description: 'CodeQL Analysis' },
  ];

  let allWorkflowsValid = true;
  workflows.forEach(({ file: filePath, description }) => {
    if (checkFile(filePath, description)) {
      if (!validateYAML(filePath)) {
        allWorkflowsValid = false;
      }
    } else {
      allWorkflowsValid = false;
    }
  });

  // Check Dependabot configuration (separate file)
  const dependabotConfig = {
    file: '.github/dependabot.yml',
    description: 'Dependabot Configuration',
  };
  if (checkFile(dependabotConfig.file, dependabotConfig.description)) {
    // For dependabot.yml, we check different YAML structure
    try {
      const content = fs.readFileSync(dependabotConfig.file, 'utf8');
      const hasVersion = content.includes('version: 2');
      const hasUpdates = content.includes('updates:');

      if (hasVersion && hasUpdates) {
        log(`  ✅ Valid Dependabot configuration`, COLORS.GREEN);
      } else {
        log(`  ❌ Invalid Dependabot configuration`, COLORS.RED);
        allWorkflowsValid = false;
      }
    } catch (error) {
      log(
        `  ❌ Error reading Dependabot configuration: ${error.message}`,
        COLORS.RED
      );
      allWorkflowsValid = false;
    }
  } else {
    allWorkflowsValid = false;
  }

  return allWorkflowsValid;
}

function checkSecretsConfiguration() {
  log('\n🔐 Checking secrets configuration guide...', COLORS.BLUE);

  const secrets = [
    'GITHUB_TOKEN',
    'NPM_TOKEN',
    'DOCKER_USERNAME',
    'DOCKER_PASSWORD',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'SNYK_TOKEN',
    'SLACK_WEBHOOK_URL',
    'SEMGREP_APP_TOKEN',
  ];

  log('Required secrets for CI/CD pipeline:', COLORS.YELLOW);
  secrets.forEach(secret => {
    log(`  - ${secret}`, COLORS.BLUE);
  });

  log(
    '\nNote: These secrets should be configured in your GitHub repository settings:',
    COLORS.YELLOW
  );
  log(
    'https://github.com/your-username/your-repo/settings/secrets/actions',
    COLORS.BLUE
  );

  return true;
}

function checkMonitoringConfiguration() {
  log('\n📊 Checking monitoring configuration...', COLORS.BLUE);

  const monitoringFiles = [
    {
      path: 'monitoring/prometheus.test.yml',
      description: 'Prometheus test configuration',
    },
    { path: '.lighthouserc.json', description: 'Lighthouse CI configuration' },
  ];

  return monitoringFiles.every(({ path: filePath, description }) =>
    checkFile(filePath, description)
  );
}

function checkIssueAndPRTemplates() {
  log('\n📝 Checking issue and PR templates...', COLORS.BLUE);

  const templates = [
    { path: '.github/PULL_REQUEST_TEMPLATE.md', description: 'PR Template' },
    {
      path: '.github/ISSUE_TEMPLATE/bug_report.md',
      description: 'Bug Report Template',
    },
    {
      path: '.github/ISSUE_TEMPLATE/feature_request.md',
      description: 'Feature Request Template',
    },
  ];

  return templates.every(({ path: filePath, description }) =>
    checkFile(filePath, description)
  );
}

function runValidationTests() {
  log('\n🧪 Running validation tests...', COLORS.BLUE);

  try {
    // Test basic Node.js functionality
    execSync('node --version', { stdio: 'pipe' });
    log('  ✅ Node.js is working', COLORS.GREEN);

    // Test package.json validity
    execSync(
      "node -e \"console.log(JSON.parse(require('fs').readFileSync('package.json', 'utf8')).name)\"",
      { stdio: 'pipe' }
    );
    log('  ✅ package.json is valid', COLORS.GREEN);

    // Test if pnpm workspaces are configured
    execSync('pnpm list --depth=0', { stdio: 'ignore' });
    log('  ✅ pnpm workspaces are working', COLORS.GREEN);

    return true;
  } catch (error) {
    log(`  ❌ Validation test failed: ${error.message}`, COLORS.RED);
    return false;
  }
}

function generateSummary(results) {
  log('\n📋 CI/CD Pipeline Validation Summary', COLORS.BLUE);
  log('=====================================', COLORS.BLUE);

  const total = Object.keys(results).length;
  const passed = Object.values(results).filter(Boolean).length;

  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const color = passed ? COLORS.GREEN : COLORS.RED;
    log(`${status} ${test}`, color);
  });

  log(
    `\nTotal: ${passed}/${total} checks passed`,
    passed === total ? COLORS.GREEN : COLORS.RED
  );

  if (passed === total) {
    log('\n🎉 All CI/CD pipeline checks passed!', COLORS.GREEN);
    log('Your pipeline is ready to go! 🚀', COLORS.GREEN);
  } else {
    log(
      '\n⚠️  Some checks failed. Please review and fix the issues above.',
      COLORS.YELLOW
    );
    log('Refer to the documentation for setup instructions.', COLORS.YELLOW);
  }

  return passed === total;
}

function main() {
  log('🚀 Claude Agent Platform CI/CD Pipeline Validation', COLORS.BLUE);
  log('================================================', COLORS.BLUE);

  const results = {
    'Workflow Files': checkWorkflowFiles(),
    Dependencies: checkDependencies(),
    'Environment Files': checkEnvironmentFiles(),
    'Required Tools': checkRequiredTools(),
    'Monitoring Configuration': checkMonitoringConfiguration(),
    'Issue/PR Templates': checkIssueAndPRTemplates(),
    'Secrets Configuration': checkSecretsConfiguration(),
    'Validation Tests': runValidationTests(),
  };

  const allPassed = generateSummary(results);
  process.exit(allPassed ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = {
  checkFile,
  validateYAML,
  checkDependencies,
  checkEnvironmentFiles,
  checkRequiredTools,
  checkWorkflowFiles,
  checkSecretsConfiguration,
  checkMonitoringConfiguration,
  checkIssueAndPRTemplates,
  runValidationTests,
};
