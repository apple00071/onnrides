const fetch = require('node-fetch');
const fs = require('fs');

async function saveAdminPage() {
  try {
    console.log('Fetching admin users page content...');
    
    // Attempt to fetch the admin users page
    const response = await fetch('http://localhost:3000/admin/users', {
      headers: {
        'Accept': 'text/html'
      }
    });

    if (!response.ok) {
      console.error(`Failed to fetch page: ${response.status} ${response.statusText}`);
      return;
    }

    const html = await response.text();
    console.log(`Received ${html.length} bytes of HTML`);

    // Save the HTML content to a file
    fs.writeFileSync('admin-users-page.html', html);
    console.log('Saved content to admin-users-page.html');
    
    // Extract and save Next.js data
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (nextDataMatch && nextDataMatch[1]) {
      console.log('Found Next.js data payload');
      
      try {
        const nextData = JSON.parse(nextDataMatch[1]);
        fs.writeFileSync('admin-users-nextdata.json', JSON.stringify(nextData, null, 2));
        console.log('Saved Next.js data to admin-users-nextdata.json');
      } catch (error) {
        console.error('Error parsing Next.js data:', error.message);
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

saveAdminPage().catch(console.error); 