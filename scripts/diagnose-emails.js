#!/usr/bin/env node
/**
 * Email System Diagnostic Tool
 * 
 * This script runs comprehensive diagnostics on the email system,
 * checking configuration, connections, and sending test emails.
 */

require('dotenv').config();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');

// Constants
const REPORT_DIR = path.join(process.cwd(), 'reports');
const SMTP_TIMEOUT = 10000; // 10 seconds
const MAX_RETRIES = 3;

// Colored console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

// Logging functions
function log(color, prefix, message) {
  const timestamp = new Date().toISOString();
  console.log(`${color}[${timestamp}] [${prefix}]${colors.reset} ${message}`);
}

const info = message => log(colors.blue, 'INFO', message);
const success = message => log(colors.green, 'SUCCESS', message);
const error = message => log(colors.red, 'ERROR', message);
const warning = message => log(colors.yellow, 'WARNING', message);
const step = message => log(colors.magenta, 'STEP', message);

// Create a diagnostic report filename
function getReportFilename() {
  const date = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(REPORT_DIR, `email-diagnostic-${date}.txt`);
}

// Run a script and capture its output
async function runScript(scriptPath, args = []) {
  return new Promise((resolve, reject) => {
    info(`Running script ${scriptPath}`);
    
    const script = spawn('node', [scriptPath, ...args], {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: '1' }
    });
    
    let output = '';
    let errorOutput = '';
    
    script.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text);
    });
    
    script.stderr.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      process.stderr.write(text);
    });
    
    script.on('close', (code) => {
      if (code === 0) {
        success(`Script ${scriptPath} completed successfully`);
        resolve({ output, errorOutput, code });
      } else {
        warning(`Script ${scriptPath} exited with code ${code}`);
        resolve({ output, errorOutput, code });
      }
    });
    
    script.on('error', (err) => {
      error(`Failed to run script ${scriptPath}: ${err.message}`);
      reject(err);
    });
  });
}

// Main function
async function main() {
  console.log('\n' + colors.bold + colors.blue + '=====================================' + colors.reset);
  console.log(colors.bold + colors.blue + '   ONNRIDES EMAIL DIAGNOSTIC UTILITY   ' + colors.reset);
  console.log(colors.bold + colors.blue + '=====================================' + colors.reset + '\n');
  
  // Create reports directory if it doesn't exist
  if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
  }
  
  const reportFile = getReportFilename();
  info(`Diagnostic report will be saved to: ${reportFile}`);
  
  // Start collecting diagnostic data
  const diagnosticData = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    node_version: process.version,
    os: {
      platform: process.platform,
      release: require('os').release(),
      hostname: require('os').hostname(),
    },
    smtp: {
      host: process.env.SMTP_HOST || 'not configured',
      port: process.env.SMTP_PORT || 'not configured',
      user: process.env.SMTP_USER || 'not configured',
      from: process.env.SMTP_FROM || 'not configured',
      has_password: Boolean(process.env.SMTP_PASS),
    },
    admin_emails: process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',') : [],
    support_email: process.env.SUPPORT_EMAIL || 'not configured',
    results: {
      email_test: null,
      admin_notification_test: null,
      api_check: null,
    },
    issues_found: [],
  };
  
  // Step 1: Run email test script
  step('1. Testing SMTP connectivity and email sending');
  try {
    const emailTestResult = await runScript(path.join(process.cwd(), 'scripts', 'test-email.js'));
    diagnosticData.results.email_test = {
      success: emailTestResult.code === 0,
      output: emailTestResult.output,
      error_output: emailTestResult.errorOutput,
    };
    
    // Check for common issues in output
    if (emailTestResult.output.includes('Authentication failed')) {
      diagnosticData.issues_found.push('SMTP authentication failure - check username and password');
    }
    if (emailTestResult.output.includes('certificate has expired')) {
      diagnosticData.issues_found.push('SMTP SSL certificate issue - check server configuration');
    }
    if (emailTestResult.output.includes('Connection timed out')) {
      diagnosticData.issues_found.push('SMTP connection timeout - check network and firewall settings');
    }
  } catch (err) {
    error(`Email test script failed: ${err.message}`);
    diagnosticData.results.email_test = {
      success: false,
      error: err.message,
    };
    diagnosticData.issues_found.push('Email test script execution failed');
  }
  
  // Step 2: Run admin notification test script
  step('2. Testing admin notification configuration');
  try {
    const adminNotificationTestResult = await runScript(path.join(process.cwd(), 'scripts', 'test-admin-notification.js'));
    diagnosticData.results.admin_notification_test = {
      success: adminNotificationTestResult.code === 0,
      output: adminNotificationTestResult.output,
      error_output: adminNotificationTestResult.errorOutput,
    };
  } catch (err) {
    error(`Admin notification test script failed: ${err.message}`);
    diagnosticData.results.admin_notification_test = {
      success: false,
      error: err.message,
    };
    diagnosticData.issues_found.push('Admin notification test script execution failed');
  }
  
  // Step 3: Check API endpoint (optional - need to start server separately)
  if (process.env.CHECK_API === 'true') {
    step('3. Testing API endpoint');
    const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
    
    try {
      const { default: fetch } = await import('node-fetch');
      const response = await fetch(`${BASE_URL}/api/admin/check-emails`);
      const data = await response.json();
      
      diagnosticData.results.api_check = {
        success: response.ok,
        status: response.status,
        data,
      };
      
      if (!response.ok) {
        diagnosticData.issues_found.push(`API check failed with status ${response.status}`);
      }
    } catch (err) {
      error(`API endpoint check failed: ${err.message}`);
      diagnosticData.results.api_check = {
        success: false,
        error: err.message,
      };
      diagnosticData.issues_found.push('API endpoint check failed - ensure server is running');
    }
  }
  
  // Step 4: Write report to file
  step('4. Generating diagnostic report');
  try {
    const reportContent = JSON.stringify(diagnosticData, null, 2);
    fs.writeFileSync(reportFile, reportContent);
    success(`Diagnostic report saved to ${reportFile}`);
  } catch (err) {
    error(`Failed to write diagnostic report: ${err.message}`);
  }
  
  // Step 5: Provide summary and recommendations
  step('5. Analysis and recommendations');
  
  console.log('\n' + colors.bold + colors.cyan + '=== SUMMARY ===' + colors.reset);
  
  // Email test results
  if (diagnosticData.results.email_test?.success) {
    success('Email test: PASSED');
  } else {
    error('Email test: FAILED');
  }
  
  // Admin notification test results
  if (diagnosticData.results.admin_notification_test?.success) {
    success('Admin notification test: PASSED');
  } else {
    error('Admin notification test: FAILED');
  }
  
  // API endpoint test results
  if (diagnosticData.results.api_check === null) {
    info('API endpoint test: SKIPPED (set CHECK_API=true to enable)');
  } else if (diagnosticData.results.api_check?.success) {
    success('API endpoint test: PASSED');
  } else {
    error('API endpoint test: FAILED');
  }
  
  // Output issues found
  if (diagnosticData.issues_found.length > 0) {
    console.log('\n' + colors.bold + colors.yellow + '=== ISSUES FOUND ===' + colors.reset);
    diagnosticData.issues_found.forEach((issue, index) => {
      console.log(`${colors.yellow}${index + 1}. ${issue}${colors.reset}`);
    });
  }
  
  // Provide recommendations
  console.log('\n' + colors.bold + colors.green + '=== RECOMMENDATIONS ===' + colors.reset);
  
  // Standard recommendations
  console.log('1. Check .env file for correct SMTP settings');
  console.log('2. Verify ADMIN_EMAILS is properly configured');
  console.log('3. If using Gmail, ensure "Less secure app access" is enabled or an app password is used');
  console.log('4. Check for rate limits with your email provider');
  console.log('5. Monitor server logs for detailed email sending errors');
  
  // Add specific recommendations based on issues
  if (diagnosticData.issues_found.some(issue => issue.includes('authentication'))) {
    console.log('6. Update your SMTP password or app password');
  }
  if (diagnosticData.issues_found.some(issue => issue.includes('timeout'))) {
    console.log('7. Check network connectivity and firewall rules for SMTP port access');
  }
  
  console.log('\n' + colors.bold + colors.blue + '=====================================' + colors.reset);
  console.log(colors.bold + colors.blue + '      DIAGNOSTIC PROCESS COMPLETE      ' + colors.reset);
  console.log(colors.bold + colors.blue + '=====================================' + colors.reset + '\n');
}

// Run the diagnostic
main().catch(err => {
  error(`Unexpected error: ${err.message}`);
  error(err.stack);
  process.exit(1);
}); 