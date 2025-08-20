const fetch = require('node-fetch');

async function testOfflineBooking() {
  try {
    const response = await fetch('http://localhost:3000/api/admin/bookings/offline', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customerName: "Test User",
        customerPhone: "+1234567890",
        customerEmail: "test@example.com",
        vehicleId: "1",
        startDate: "2024-03-20T10:00:00Z",
        endDate: "2024-03-21T10:00:00Z",
        totalAmount: 100,
        paymentMethod: "cash",
        paymentStatus: "paid",
        paymentReference: "OFF123",
        notes: "Test booking"
      })
    });

    const data = await response.json();
    console.log('Response:', {
      status: response.status,
      data
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

testOfflineBooking(); 