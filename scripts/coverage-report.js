#!/usr/bin/env node

/**
 * Coverage reporting script
 * Generates detailed coverage reports and sends notifications
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class CoverageReporter {
  constructor() {
    this.coverageDir = path.join(process.cwd(), 'coverage');
    this.summaryFile = path.join(this.coverageDir, 'coverage-summary.json');
    this.lcovFile = path.join(this.coverageDir, 'lcov.info');
  }

  /**
   * Generate coverage report
   */
  async generateReport() {
    console.log('📊 Generating coverage report...');

    try {
      // Ensure coverage directory exists
      if (!fs.existsSync(this.coverageDir)) {
        console.log('❌ Coverage directory not found. Run tests first.');
        process.exit(1);
      }

      // Read coverage summary
      const summary = this.readCoverageSummary();

      // Generate console report
      this.generateConsoleReport(summary);

      // Generate HTML report summary
      this.generateHTMLSummary(summary);

      // Check coverage thresholds
      this.checkThresholds(summary);

      // Generate badge
      await this.generateBadge(summary);

      console.log('✅ Coverage report generated successfully');

    } catch (error) {
      console.error('❌ Error generating coverage report:', error.message);
      process.exit(1);
    }
  }

  /**
   * Read coverage summary
   */
  readCoverageSummary() {
    if (!fs.existsSync(this.summaryFile)) {
      throw new Error('Coverage summary file not found');
    }

    return JSON.parse(fs.readFileSync(this.summaryFile, 'utf8'));
  }

  /**
   * Generate console report
   */
  generateConsoleReport(summary) {
    console.log('\n📈 Coverage Summary:');
    console.log('═'.repeat(50));

    for (const [file, coverage] of Object.entries(summary)) {
      if (file === 'total') {
        console.log(`\n🎯 Overall Coverage:`);
        console.log(`  Statements: ${coverage.statements.pct}% (${coverage.statements.covered}/${coverage.statements.total})`);
        console.log(`  Branches:   ${coverage.branches.pct}% (${coverage.branches.covered}/${coverage.branches.total})`);
        console.log(`  Functions:  ${coverage.functions.pct}% (${coverage.functions.covered}/${coverage.functions.total})`);
        console.log(`  Lines:      ${coverage.lines.pct}% (${coverage.lines.covered}/${coverage.lines.total})`);
      } else {
        const fileName = path.basename(file);
        console.log(`\n📁 ${fileName}:`);
        console.log(`  Lines: ${coverage.lines.pct}% (${coverage.lines.covered}/${coverage.lines.total})`);
      }
    }

    console.log('\n' + '═'.repeat(50));
  }

  /**
   * Generate HTML summary
   */
  generateHTMLSummary(summary) {
    const total = summary.total;
    const timestamp = new Date().toISOString();

    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Coverage Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .metric { display: inline-block; margin: 10px; padding: 10px; background: #e9ecef; border-radius: 3px; }
        .metric.high { background: #d4edda; color: #155724; }
        .metric.medium { background: #fff3cd; color: #856404; }
        .metric.low { background: #f8d7da; color: #721c24; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f5f5f5; }
        .progress { width: 100px; height: 10px; background: #e9ecef; border-radius: 5px; overflow: hidden; }
        .progress-bar { height: 100%; background: #28a745; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Test Coverage Report</h1>
        <p>Generated on: ${timestamp}</p>

        <div class="metric ${this.getCoverageClass(total.statements.pct)}">
            <strong>Statements:</strong> ${total.statements.pct}%
        </div>
        <div class="metric ${this.getCoverageClass(total.branches.pct)}">
            <strong>Branches:</strong> ${total.branches.pct}%
        </div>
        <div class="metric ${this.getCoverageClass(total.functions.pct)}">
            <strong>Functions:</strong> ${total.functions.pct}%
        </div>
        <div class="metric ${this.getCoverageClass(total.lines.pct)}">
            <strong>Lines:</strong> ${total.lines.pct}%
        </div>
    </div>

    <h2>Coverage by File</h2>
    <table>
        <thead>
            <tr>
                <th>File</th>
                <th>Statements</th>
                <th>Branches</th>
                <th>Functions</th>
                <th>Lines</th>
            </tr>
        </thead>
        <tbody>
            ${Object.entries(summary)
              .filter(([file]) => file !== 'total')
              .map(([file, coverage]) => `
                <tr>
                    <td>${path.basename(file)}</td>
                    <td>
                        ${this.createProgressBar(coverage.statements.pct)}
                        ${coverage.statements.pct}%
                    </td>
                    <td>
                        ${this.createProgressBar(coverage.branches.pct)}
                        ${coverage.branches.pct}%
                    </td>
                    <td>
                        ${this.createProgressBar(coverage.functions.pct)}
                        ${coverage.functions.pct}%
                    </td>
                    <td>
                        ${this.createProgressBar(coverage.lines.pct)}
                        ${coverage.lines.pct}%
                    </td>
                </tr>
              `).join('')}
        </tbody>
    </table>
</body>
</html>`;

    fs.writeFileSync(path.join(this.coverageDir, 'summary.html'), html);
  }

  /**
   * Get coverage CSS class
   */
  getCoverageClass(percentage) {
    if (percentage >= 80) return 'high';
    if (percentage >= 60) return 'medium';
    return 'low';
  }

  /**
   * Create progress bar HTML
   */
  createProgressBar(percentage) {
    return `<div class="progress"><div class="progress-bar" style="width: ${percentage}%"></div></div>`;
  }

  /**
   * Check coverage thresholds
   */
  checkThresholds(summary) {
    const total = summary.total;
    const thresholds = {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80
    };

    console.log('\n🎯 Coverage Thresholds:');

    let allPassed = true;

    for (const [metric, threshold] of Object.entries(thresholds)) {
      const coverage = total[metric].pct;
      const passed = coverage >= threshold;
      const status = passed ? '✅' : '❌';

      console.log(`  ${status} ${metric}: ${coverage}% (threshold: ${threshold}%)`);

      if (!passed) {
        allPassed = false;
      }
    }

    if (!allPassed) {
      console.log('\n❌ Some coverage thresholds not met');
      process.exit(1);
    } else {
      console.log('\n✅ All coverage thresholds met');
    }
  }

  /**
   * Generate coverage badge
   */
  async generateBadge(summary) {
    const total = summary.total;
    const coverage = total.lines.pct;

    const color = coverage >= 80 ? 'brightgreen' : coverage >= 60 ? 'yellow' : 'red';
    const badgeUrl = `https://img.shields.io/badge/coverage-${coverage}%25-${color}`;

    const badgeSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="20">
    <rect width="100" height="20" rx="3" fill="#555"/>
    <rect x="60" width="40" height="20" rx="3" fill="${color}"/>
    <text x="30" y="14" font-family="Arial" font-size="11" fill="white" text-anchor="middle">coverage</text>
    <text x="80" y="14" font-family="Arial" font-size="11" fill="white" text-anchor="middle">${coverage}%</text>
</svg>`;

    fs.writeFileSync(path.join(this.coverageDir, 'badge.svg'), badgeSvg);
  }

  /**
   * Send coverage notification (placeholder for Slack/Discord)
   */
  async sendNotification(summary) {
    const total = summary.total;
    const message = `📊 Coverage Report: ${total.lines.pct}% (${total.lines.covered}/${total.lines.total} lines)`;

    // This would integrate with your notification system
    console.log('📢 Notification:', message);
  }
}

// Run the coverage reporter
if (require.main === module) {
  const reporter = new CoverageReporter();
  reporter.generateReport().catch(console.error);
}

module.exports = CoverageReporter;
