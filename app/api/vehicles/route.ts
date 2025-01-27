import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { VEHICLE_STATUS } from '@/lib/db/schema';

interface CreateVehicleBody {
  name: string;
  type: string;
  location: string[];
  price_per_hour: number;
  description?: string;
  features?: string[];
  images?: string[];
  status?: string;
}

interface PricingPlan {
  hours: number;
  price: number;
  label: string;
  description: string;
  savings_percentage?: number;
}

interface VehiclePricing {
  price_per_hour: number;
  total_hours: number;
  chargeable_hours: number;
  total_price: number;
  booking_details: BookingDetails;
  selected_plan?: PricingPlan;
}

interface BookingDetails {
  id: string;
  vehicleId: string;
  vehicleName: string;
  vehicleImage: string;
  pricePerHour: number;
  location: string;
  pickupDate: string;
  pickupTime: string;
  dropoffDate: string;
  dropoffTime: string;
  minHours: number;
  maxHours: number;
  weekendMultiplier: number;
  minBookingNotice: number;
  maxBookingAdvance: number;
  allowedPickupTimes: string[];
  allowedDropoffTimes: string[];
  pricingPlans: PricingPlan[];
  termsAndConditions: {
    deposit: number;
    fuelPolicy: string;
    insuranceDetails: string;
    cancellationPolicy: string;
    documentsRequired: string[];
  };
}

interface VehicleResponse {
  id: string;
  name: string;
  type: string;
  status: string;
  price_per_hour: number;
  description?: string;
  features: string[];
  images: string[];
  image_url: string;
  location: string[];
  active_bookings: any[];
  pricing: VehiclePricing;
  booking_details: BookingDetails;
}

// Helper function to check if a date is a weekend
function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 is Sunday, 6 is Saturday
}

// Helper function to calculate price based on duration and weekday/weekend
function calculatePrice(pricePerHour: number, startDate: Date, endDate: Date): {
  totalHours: number,
  chargeableHours: number,
  totalPrice: number
} {
  const diffMs = endDate.getTime() - startDate.getTime();
  const totalHours = Math.ceil(diffMs / (1000 * 60 * 60));
  
  // Check if any part of the booking is on a weekend
  let weekendHours = 0;
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    if (isWeekend(currentDate)) {
      weekendHours += 24; // Add 24 hours for each weekend day
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Minimum booking is 12 hours
  const chargeableHours = Math.max(totalHours, 12);
  
  // Weekend pricing: 20% more expensive
  const weekdayHours = chargeableHours - weekendHours;
  const weekdayPrice = pricePerHour * weekdayHours;
  const weekendPrice = pricePerHour * weekendHours * 1.2;
  const totalPrice = weekdayPrice + weekendPrice;

  return {
    totalHours,
    chargeableHours,
    totalPrice
  };
}

// GET /api/vehicles - List all vehicles
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const locations = searchParams.getAll('location');
    const pickupDate = searchParams.get('pickupDate');
    const pickupTime = searchParams.get('pickupTime');
    const dropoffDate = searchParams.get('dropoffDate');
    const dropoffTime = searchParams.get('dropoffTime');
    const minPrice = Number(searchParams.get('minPrice')) || 0;
    const maxPrice = Number(searchParams.get('maxPrice')) || Number.MAX_SAFE_INTEGER;

    logger.info('Search params:', { 
      type, locations, pickupDate, pickupTime, dropoffDate, dropoffTime, minPrice, maxPrice 
    });

    // First, let's check what vehicles exist in the database
    const debugResult = await query('SELECT id, name, type, status, price_per_hour FROM vehicles');
    logger.debug('All vehicles in database:', debugResult.rows);

    let sql = '';
    let params: any[] = [];
    let paramIndex = 1;

    // Build the base query for vehicles
    if (pickupDate && pickupTime && dropoffDate && dropoffTime) {
      sql = `
        SELECT v.*, 
          COALESCE(
            (SELECT json_agg(b.*)
             FROM bookings b 
             WHERE b.vehicle_id = v.id 
             AND b.status = 'active'
             AND (
               ($${paramIndex + 1}::timestamp, $${paramIndex + 2}::timestamp) OVERLAPS 
               (b.start_date, b.end_date)
             )
            ), '[]'
          ) as active_bookings
        FROM vehicles v 
        WHERE v.status = $${paramIndex}
      `;
      params.push(
        'active',
        `${pickupDate}T${pickupTime}`,
        `${dropoffDate}T${dropoffTime}`
      );
      paramIndex += 3;
    } else {
      sql = `
        SELECT v.*, '[]'::json as active_bookings
        FROM vehicles v 
        WHERE v.status = $${paramIndex++}
      `;
      params.push('active');
    }

    // Add price range filter
    sql += ` AND v.price_per_hour BETWEEN $${paramIndex++} AND $${paramIndex++}`;
    params.push(minPrice, maxPrice);

    // Add type filter if provided
    if (type) {
      sql += ` AND v.type = $${paramIndex++}`;
      params.push(type);
    }

    // Add location filter if provided
    if (locations.length > 0) {
      const locationConditions = locations.map(location => {
        params.push(location);
        return `v.location::jsonb ? $${paramIndex++}`;
      });
      sql += ` AND (${locationConditions.join(' OR ')})`;
    }

    sql += ` ORDER BY v.created_at DESC`;

    logger.debug('SQL Query:', sql);
    logger.debug('Query params:', params);

    const result = await query(sql, params);
    logger.debug('Query result:', result.rows);

    const formattedVehicles = result.rows.map(vehicle => {
      let parsedLocation;
      let parsedImages;
      const pricePerHour = Number(vehicle.price_per_hour);

      try {
        parsedLocation = JSON.parse(vehicle.location);
      } catch (e) {
        parsedLocation = vehicle.location ? [vehicle.location] : [];
        logger.error('Error parsing location:', e);
      }

      try {
        parsedImages = Array.isArray(vehicle.images) ? vehicle.images : JSON.parse(vehicle.images || '[]');
      } catch (e) {
        parsedImages = [];
        logger.error('Error parsing images:', e);
      }

      // Default booking details
      const bookingDetails = {
        id: '',
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        vehicleImage: parsedImages.length > 0 ? parsedImages[0] : '/placeholder.png',
        pricePerHour: Number(vehicle.price_per_hour),
        location: parsedLocation[0] || '',
        pickupDate: pickupDate || '',
        pickupTime: pickupTime || '',
        dropoffDate: dropoffDate || '',
        dropoffTime: dropoffTime || '',
        minHours: 12,
        maxHours: 720, // 30 days
        weekendMultiplier: 1.2,
        minBookingNotice: 2, // 2 hours in advance
        maxBookingAdvance: 90, // 90 days in advance
        allowedPickupTimes: [
          '00:00', '06:00', '07:00', '08:00', '09:00', '10:00', 
          '11:00', '12:00', '13:00', '14:00', '15:00', '16:00',
          '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'
        ],
        allowedDropoffTimes: [
          '00:00', '06:00', '07:00', '08:00', '09:00', '10:00', 
          '11:00', '12:00', '13:00', '14:00', '15:00', '16:00',
          '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'
        ],
        pricingPlans: [
          { 
            hours: 12, 
            price: Number(vehicle.price_per_hour) * 12, 
            label: '12 Hours', 
            description: 'Perfect for day trips and short rentals',
            savingsPercentage: 0
          },
          { 
            hours: 24, 
            price: Number(vehicle.price_per_hour) * 24, 
            label: '24 Hours',
            description: 'Full day rental with maximum flexibility',
            savingsPercentage: 0
          },
          { 
            hours: 72, 
            price: Number(vehicle.price_per_hour) * 72 * 0.9, 
            label: '3 Days',
            description: 'Extended weekend or short vacation rental',
            savingsPercentage: 10
          },
          { 
            hours: 168, 
            price: Number(vehicle.price_per_hour) * 168 * 0.85, 
            label: '7 Days',
            description: 'Weekly rental with significant savings',
            savingsPercentage: 15
          },
          { 
            hours: 360, 
            price: Number(vehicle.price_per_hour) * 360 * 0.8, 
            label: '15 Days',
            description: 'Perfect for long vacations',
            savingsPercentage: 20
          },
          { 
            hours: 720, 
            price: Number(vehicle.price_per_hour) * 720 * 0.75, 
            label: '30 Days',
            description: 'Monthly rental with maximum savings',
            savingsPercentage: 25
          }
        ],
        termsAndConditions: {
          deposit: 5000,
          fuelPolicy: 'Return with same fuel level as pickup',
          insuranceDetails: 'Basic insurance included, premium options available',
          cancellationPolicy: 'Free cancellation up to 24 hours before pickup',
          documentsRequired: [
            'Valid Driver\'s License',
            'Credit Card',
            'Proof of Identity',
            'Security Deposit'
          ]
        }
      };

      let pricing = {
        price_per_hour: Number(vehicle.price_per_hour),
        total_hours: bookingDetails.minHours,
        chargeable_hours: bookingDetails.minHours,
        total_price: Number(vehicle.price_per_hour) * bookingDetails.minHours,
        booking_details: bookingDetails
      };

      // Calculate pricing if dates are provided
      if (pickupDate && pickupTime && dropoffDate && dropoffTime) {
        const startDate = new Date(`${pickupDate}T${pickupTime}`);
        const endDate = new Date(`${dropoffDate}T${dropoffTime}`);
        
        const calculatedPricing = calculatePrice(
          Number(vehicle.price_per_hour),
          startDate,
          endDate
        );

        // Find the best pricing plan based on duration
        const hours = calculatedPricing.chargeableHours;
        const applicablePlan = bookingDetails.pricingPlans
          .filter(plan => plan.hours <= hours)
          .sort((a, b) => b.hours - a.hours)[0];

        const finalPrice = applicablePlan 
          ? applicablePlan.price * (hours / applicablePlan.hours)
          : calculatedPricing.totalPrice;

        pricing = {
          price_per_hour: Number(vehicle.price_per_hour),
          total_hours: calculatedPricing.totalHours,
          chargeable_hours: calculatedPricing.chargeableHours,
          total_price: finalPrice,
          booking_details: bookingDetails
        };
      }

      return {
        ...vehicle,
        location: parsedLocation,
        images: parsedImages,
        image_url: parsedImages.length > 0 ? parsedImages[0] : '/placeholder.png',
        features: Array.isArray(vehicle.features) ? vehicle.features : [],
        active_bookings: Array.isArray(vehicle.active_bookings) ? vehicle.active_bookings : [],
        pricing,
        booking_details: bookingDetails
      };
    });

    // Filter out vehicles with active bookings during the requested time
    const availableVehicles = formattedVehicles.filter(vehicle => 
      vehicle.active_bookings.length === 0
    );

    if (availableVehicles.length === 0) {
      return NextResponse.json(
        { 
          vehicles: [], 
          message: 'No vehicles available for the selected criteria.' 
        }
      );
    }

    return NextResponse.json({ vehicles: availableVehicles });
  } catch (error) {
    logger.error('Error fetching vehicles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicles' },
      { status: 500 }
    );
  }
}

// POST /api/vehicles - Create vehicle
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      type,
      location,
      price_per_hour,
      description,
      features,
      images,
      status = 'active',
    } = body as CreateVehicleBody;

    // Validate required fields
    if (!name || !type || !price_per_hour) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Ensure arrays are properly formatted for PostgreSQL
    const locationJson = Array.isArray(location) 
      ? JSON.stringify(location)
      : JSON.stringify([location]);

    const featuresArray = Array.isArray(features) ? features : [];
    const imagesArray = Array.isArray(images) ? images : [];

    const result = await query(
      `INSERT INTO vehicles (
        name, type, location, price_per_hour, description, 
        features, images, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
      RETURNING *`,
      [
        name,
        type,
        locationJson,
        price_per_hour,
        description || null,
        featuresArray,
        imagesArray,
        status
      ]
    );

    const vehicle = result.rows[0];

    return NextResponse.json({
      message: 'Vehicle created successfully',
      vehicle: {
        ...vehicle,
        location: JSON.parse(vehicle.location),
        images: vehicle.images || [],
        features: vehicle.features || []
      }
    });
  } catch (error) {
    logger.error('Error creating vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to create vehicle' },
      { status: 500 }
    );
  }
} 