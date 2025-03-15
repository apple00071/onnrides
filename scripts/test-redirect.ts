import { config } from 'dotenv';
import { resolve } from 'path';
import { fetch } from 'undici';
import logger from '../lib/logger';

// Load environment variables
const envPath = resolve(__dirname, '../.env');
config({ path: envPath });

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function testHomeRedirect() {
  logger.info('Testing redirection from /home to root URL...');
  
  try {
    // Attempt to fetch the /home URL and check if it redirects
    const response = await fetch(`${appUrl}/home`, {
      redirect: 'manual', // Don't follow redirects automatically
      headers: {
        'User-Agent': 'OnnRides-Test/1.0'
      }
    });
    
    // Check if we got a redirect status code (3xx)
    const isRedirect = response.status >= 300 && response.status < 400;
    
    // Get the redirect location
    const location = response.headers.get('location');
    
    if (isRedirect && location) {
      const expectedLocation = '/';
      
      if (location === expectedLocation || location === appUrl + expectedLocation) {
        logger.info('✅ Redirect working correctly!', {
          from: '/home',
          to: location,
          status: response.status
        });
      } else {
        logger.error('❌ Unexpected redirect location!', {
          from: '/home',
          actual: location,
          expected: expectedLocation,
          status: response.status
        });
      }
    } else {
      logger.error('❌ No redirect detected!', {
        status: response.status,
        isRedirect,
        location
      });
    }
    
    // Now test the root URL to make sure it's serving content properly
    logger.info('Testing root URL...');
    const rootResponse = await fetch(appUrl, {
      headers: {
        'User-Agent': 'OnnRides-Test/1.0'
      }
    });
    
    if (rootResponse.ok) {
      logger.info('✅ Root URL working correctly!', {
        status: rootResponse.status
      });
    } else {
      logger.error('❌ Root URL not working!', {
        status: rootResponse.status
      });
    }
    
    process.exit(0);
  } catch (error) {
    logger.error('Error testing redirects:', error);
    process.exit(1);
  }
}

testHomeRedirect(); 