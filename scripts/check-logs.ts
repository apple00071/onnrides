import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');

// Function to read log files and check for P2021 errors
function checkLogsForP2021Errors() {
  try {
    // Check if logs directory exists
    if (!fs.existsSync(LOG_DIR)) {
      console.log('Logs directory does not exist');
      return;
    }
    
    // Get all log files
    const logFiles = fs.readdirSync(LOG_DIR)
      .filter(file => file.endsWith('.log'))
      .sort((a, b) => {
        // Sort by modification time, newest first
        return fs.statSync(path.join(LOG_DIR, b)).mtime.getTime() -
               fs.statSync(path.join(LOG_DIR, a)).mtime.getTime();
      });
    
    if (logFiles.length === 0) {
      console.log('No log files found');
      return;
    }
    
    console.log(`Found ${logFiles.length} log files, checking most recent ones...`);
    
    // Check the most recent 5 log files
    const recentLogs = logFiles.slice(0, 5);
    
    let p2021ErrorsFound = false;
    
    recentLogs.forEach(logFile => {
      const logPath = path.join(LOG_DIR, logFile);
      const logContent = fs.readFileSync(logPath, 'utf8');
      
      // Check for P2021 errors
      const p2021Errors = logContent.match(/P2021|table.*not\s+found|relation.*does\s+not\s+exist/gi);
      
      if (p2021Errors && p2021Errors.length > 0) {
        p2021ErrorsFound = true;
        console.log(`\nFound P2021 errors in ${logFile}:`);
        
        // Find lines with P2021 errors
        const lines = logContent.split('\n');
        lines.forEach((line, index) => {
          if (line.match(/P2021|table.*not\s+found|relation.*does\s+not\s+exist/gi)) {
            console.log(`Line ${index + 1}: ${line}`);
          }
        });
      }
    });
    
    if (!p2021ErrorsFound) {
      console.log('\nNo P2021 errors found in recent logs. The settings table issue appears to be resolved!');
    }
  } catch (error) {
    console.error('Error checking logs:', error);
  }
}

// Run the check
checkLogsForP2021Errors(); 