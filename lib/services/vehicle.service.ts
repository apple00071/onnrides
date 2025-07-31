import { Vehicle } from '../firebase/models';
import { createDoc, updateDoc, getDocById, queryDocs, deleteDoc } from '../firebase/utils';

export class VehicleService {
  // Create a new vehicle
  static async createVehicle(data: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      return await createDoc<Vehicle>('VEHICLES', data);
    } catch (error) {
      console.error('Error creating vehicle:', error);
      throw error;
    }
  }

  // Get vehicle by ID
  static async getVehicleById(id: string): Promise<Vehicle | null> {
    return getDocById<Vehicle>('VEHICLES', id);
  }

  // Update vehicle
  static async updateVehicle(id: string, data: Partial<Vehicle>): Promise<void> {
    try {
      await updateDoc<Vehicle>('VEHICLES', id, data);
    } catch (error) {
      console.error('Error updating vehicle:', error);
      throw error;
    }
  }

  // Delete vehicle
  static async deleteVehicle(id: string): Promise<void> {
    try {
      await deleteDoc('VEHICLES', id);
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      throw error;
    }
  }

  // List vehicles with pagination and filters
  static async listVehicles(options: {
    categoryId?: string;
    status?: Vehicle['status'];
    isActive?: boolean;
    minPrice?: number;
    maxPrice?: number;
    page?: number;
    limit?: number;
    search?: string;
    featured?: boolean;
  } = {}): Promise<{ vehicles: Vehicle[]; total: number }> {
    try {
      const {
        categoryId,
        status,
        isActive,
        minPrice,
        maxPrice,
        page = 1,
        limit = 10,
        search,
        featured,
      } = options;

      const where: [string, any, any][] = [];

      if (categoryId) {
        where.push(['categoryId', '==', categoryId]);
      }
      if (status) {
        where.push(['status', '==', status]);
      }
      if (typeof isActive === 'boolean') {
        where.push(['isActive', '==', isActive]);
      }
      if (featured) {
        where.push(['featured', '==', true]);
      }
      if (minPrice !== undefined) {
        where.push(['price.hourly', '>=', minPrice]);
      }
      if (maxPrice !== undefined) {
        where.push(['price.hourly', '<=', maxPrice]);
      }
      if (search) {
        where.push(['name', '>=', search]);
        where.push(['name', '<=', search + '\uf8ff']);
      }

      const vehicles = await queryDocs<Vehicle>('VEHICLES', {
        where,
        orderBy: [{ field: 'createdAt', direction: 'desc' }],
        limit,
        offset: (page - 1) * limit,
      });

      // Get total count (in a real app, you might want to use a counter collection for this)
      const total = vehicles.length; // This is a simplification

      return { vehicles, total };
    } catch (error) {
      console.error('Error listing vehicles:', error);
      throw error;
    }
  }

  // Get featured vehicles
  static async getFeaturedVehicles(limit = 4): Promise<Vehicle[]> {
    try {
      return await queryDocs<Vehicle>('VEHICLES', {
        where: [
          ['isActive', '==', true],
          ['status', '==', 'available'],
          ['featured', '==', true],
        ],
        orderBy: [{ field: 'createdAt', direction: 'desc' }],
        limit,
      });
    } catch (error) {
      console.error('Error getting featured vehicles:', error);
      throw error;
    }
  }

  // Get vehicles by category
  static async getVehiclesByCategory(categoryId: string, limit = 10): Promise<Vehicle[]> {
    try {
      return await queryDocs<Vehicle>('VEHICLES', {
        where: [
          ['categoryId', '==', categoryId],
          ['isActive', '==', true],
        ],
        orderBy: [{ field: 'createdAt', direction: 'desc' }],
        limit,
      });
    } catch (error) {
      console.error('Error getting vehicles by category:', error);
      throw error;
    }
  }

  // Search vehicles by location
  static async searchVehiclesByLocation(
    latitude: number,
    longitude: number,
    radiusInKm = 10
  ): Promise<Vehicle[]> {
    try {
      // In a real app, you would use Firestore's geoqueries
      // For now, we'll just return all available vehicles
      return await queryDocs<Vehicle>('VEHICLES', {
        where: [
          ['isActive', '==', true],
          ['status', '==', 'available'],
        ],
        orderBy: [{ field: 'createdAt', direction: 'desc' }],
      });
    } catch (error) {
      console.error('Error searching vehicles by location:', error);
      throw error;
    }
  }

  // Update vehicle status
  static async updateVehicleStatus(id: string, status: Vehicle['status']): Promise<void> {
    try {
      await updateDoc<Vehicle>('VEHICLES', id, { status });
    } catch (error) {
      console.error('Error updating vehicle status:', error);
      throw error;
    }
  }
} 