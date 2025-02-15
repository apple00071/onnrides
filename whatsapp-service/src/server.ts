import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import logger from './logger';
import { initializeDirectories } from './init';
import { WhatsAppService } from './service';
import { getQRCode } from './config';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
}));

// Authentication middleware
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey || apiKey !== process.env.SERVICE_API_KEY) {
        logger.warn('Unauthorized request attempt');
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    next();
};

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
});

// Initialize WhatsApp endpoint
app.get('/whatsapp/init', authMiddleware, (_req: Request, res: Response) => {
    const whatsapp = WhatsAppService.getInstance();
    const status = whatsapp.getInitializationStatus();
    
    if (status.error) {
        return res.status(500).json({ 
            error: 'WhatsApp initialization failed',
            details: status.error.message
        });
    }
    
    const qrCode = getQRCode();
    
    res.json({
        initialized: status.isInitialized,
        qrCode: !status.isInitialized ? qrCode : null
    });
});

// WhatsApp status endpoint
app.get('/whatsapp/status', authMiddleware, (_req: Request, res: Response) => {
    const whatsapp = WhatsAppService.getInstance();
    const status = whatsapp.getInitializationStatus();
    
    res.json({
        initialized: status.isInitialized,
        error: status.error?.message
    });
});

interface SendMessageRequest {
    to: string;
    message: string;
    bookingId?: string;
}

// Send message endpoint
app.post('/whatsapp/send', authMiddleware, async (req: Request<{}, {}, SendMessageRequest>, res: Response) => {
    const { to, message, bookingId } = req.body;
    
    if (!to || !message) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    try {
        const whatsapp = WhatsAppService.getInstance();
        await whatsapp.sendMessage(to, message, bookingId);
        res.json({ success: true });
    } catch (error) {
        logger.error('Failed to send WhatsApp message:', error);
        res.status(500).json({ 
            error: 'Failed to send message',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

interface BookingConfirmationRequest {
    phone: string;
    userName: string;
    vehicleDetails: string;
    bookingDate: string;
    bookingId?: string;
}

// Booking confirmation endpoint
app.post('/whatsapp/booking/confirm', authMiddleware, async (req: Request<{}, {}, BookingConfirmationRequest>, res: Response) => {
    const { phone, userName, vehicleDetails, bookingDate, bookingId } = req.body;
    
    if (!phone || !userName || !vehicleDetails || !bookingDate) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    try {
        const whatsapp = WhatsAppService.getInstance();
        const success = await whatsapp.sendBookingConfirmation(
            phone,
            userName,
            vehicleDetails,
            bookingDate,
            bookingId
        );
        
        res.json({ success });
    } catch (error) {
        logger.error('Failed to send booking confirmation:', error);
        res.status(500).json({ 
            error: 'Failed to send booking confirmation',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

interface BookingCancellationRequest {
    phone: string;
    userName: string;
    vehicleDetails: string;
    bookingId?: string;
}

// Booking cancellation endpoint
app.post('/whatsapp/booking/cancel', authMiddleware, async (req: Request<{}, {}, BookingCancellationRequest>, res: Response) => {
    const { phone, userName, vehicleDetails, bookingId } = req.body;
    
    if (!phone || !userName || !vehicleDetails) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    try {
        const whatsapp = WhatsAppService.getInstance();
        const success = await whatsapp.sendBookingCancellation(
            phone,
            userName,
            vehicleDetails,
            bookingId
        );
        
        res.json({ success });
    } catch (error) {
        logger.error('Failed to send booking cancellation:', error);
        res.status(500).json({ 
            error: 'Failed to send booking cancellation',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

interface PaymentConfirmationRequest {
    phone: string;
    userName: string;
    amount: string;
    bookingId: string;
}

// Payment confirmation endpoint
app.post('/whatsapp/payment/confirm', authMiddleware, async (req: Request<{}, {}, PaymentConfirmationRequest>, res: Response) => {
    const { phone, userName, amount, bookingId } = req.body;
    
    if (!phone || !userName || !amount || !bookingId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    try {
        const whatsapp = WhatsAppService.getInstance();
        const success = await whatsapp.sendPaymentConfirmation(
            phone,
            userName,
            amount,
            bookingId
        );
        
        res.json({ success });
    } catch (error) {
        logger.error('Failed to send payment confirmation:', error);
        res.status(500).json({ 
            error: 'Failed to send payment confirmation',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Start the server
const startServer = async () => {
    try {
        // Initialize required directories
        initializeDirectories();
        
        // Initialize WhatsApp service
        WhatsAppService.getInstance();
        
        app.listen(port, () => {
            logger.info(`WhatsApp service listening on port ${port}`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer(); 