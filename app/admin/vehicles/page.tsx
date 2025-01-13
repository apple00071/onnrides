'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import Image from 'next/image';
import logger from '@/lib/logger';
<<<<<<< HEAD
import AddVehicleModal from './components/AddVehicleModal';
import EditVehicleModal from './components/EditVehicleModal';
=======
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';
>>>>>>> 5a6f20b58703b8cab668293ed267069313eed56a

interface Vehicle {
  id: string;
  name: string;
  type: string;
  location: string[];
  quantity: number;
  price_per_day: number;
  is_available: boolean;
  status: 'available' | 'booked' | 'maintenance';
  image_url: string;
  created_at: string;
  updated_at: string;
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const response = await fetch('/api/admin/vehicles');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch vehicles');
      }
      
      const data = await response.json();
      setVehicles(data);
    } catch (error) {
      logger.error('Error:', error);
      toast.error('Failed to fetch vehicles');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
<<<<<<< HEAD
    if (!confirm('Are you sure you want to delete this vehicle?')) return;

    try {
      const response = await fetch(`/api/admin/vehicles/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete vehicle');
=======
    try {
      const response = await fetch(`/api/admin/vehicles?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete vehicle');
>>>>>>> 5a6f20b58703b8cab668293ed267069313eed56a
      }

      toast.success('Vehicle deleted successfully');
      fetchVehicles();
    } catch (error) {
      logger.error('Error:', error);
      toast.error('Failed to delete vehicle');
    }
  };

<<<<<<< HEAD
  const handleEdit = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsEditModalOpen(true);
  };

  const handleVehicleUpdated = () => {
    setIsEditModalOpen(false);
    setSelectedVehicle(null);
    fetchVehicles();
  };

  const handleVehicleAdded = () => {
    setIsAddModalOpen(false);
    fetchVehicles();
  };

=======
>>>>>>> 5a6f20b58703b8cab668293ed267069313eed56a
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Vehicles Management</h1>
<<<<<<< HEAD
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-[#f26e24] text-white rounded-md hover:bg-[#e05d13] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f26e24]"
        >
          <FaPlus className="w-4 h-4 mr-2" />
          Add Vehicle
        </button>
      </div>

      {vehicles.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No vehicles found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((vehicle) => (
            <div key={vehicle.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="relative h-48">
                <Image
                  src={vehicle.image_url || '/placeholder-vehicle.jpg'}
                  alt={vehicle.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold">{vehicle.name}</h3>
                <p className="text-sm text-gray-600">{vehicle.type}</p>
                <p className="text-sm text-gray-600">Locations: {vehicle.location.join(', ')}</p>
                <p className="text-sm text-gray-600">Quantity: {vehicle.quantity}</p>
                <p className="mt-2 text-lg font-bold">₹{vehicle.price_per_day}/day</p>
                <p className="text-sm text-gray-600">Status: {vehicle.status}</p>
                <p className="text-sm text-gray-600">Available: {vehicle.is_available ? 'Yes' : 'No'}</p>
                <div className="mt-4 flex justify-end space-x-2">
                  <button
                    onClick={() => handleEdit(vehicle)}
                    className="p-2 text-blue-600 hover:text-blue-800"
                  >
                    <FaEdit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(vehicle.id)}
                    className="p-2 text-red-600 hover:text-red-800"
                  >
                    <FaTrash className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Vehicle Modal */}
      <AddVehicleModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onVehicleAdded={handleVehicleAdded}
      />

      {/* Edit Vehicle Modal */}
      {selectedVehicle && (
        <EditVehicleModal
          vehicle={selectedVehicle}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedVehicle(null);
          }}
          onVehicleUpdated={handleVehicleUpdated}
        />
      )}
=======
        <Link href="/admin/vehicles/add">
          <Button>Add Vehicle</Button>
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Locations</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Price/Day</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.map((vehicle) => (
              <TableRow key={vehicle.id}>
                <TableCell>
                  <div className="relative h-12 w-12">
                    <Image
                      src={vehicle.image_url}
                      alt={vehicle.name}
                      fill
                      className="object-cover rounded"
                    />
                  </div>
                </TableCell>
                <TableCell>{vehicle.name}</TableCell>
                <TableCell>{vehicle.type}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {vehicle.location.map((loc) => (
                      <Badge key={loc} variant="secondary">
                        {loc}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>{vehicle.quantity}</TableCell>
                <TableCell>₹{vehicle.price_per_day}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      vehicle.status === 'active'
                        ? 'success'
                        : vehicle.status === 'maintenance'
                        ? 'warning'
                        : 'destructive'
                    }
                  >
                    {vehicle.status}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(vehicle.created_at)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/vehicles/edit/${vehicle.id}`}>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </Link>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(vehicle.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
>>>>>>> 5a6f20b58703b8cab668293ed267069313eed56a
    </div>
  );
} 