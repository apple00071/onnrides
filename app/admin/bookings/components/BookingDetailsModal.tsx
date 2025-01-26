import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface Booking {
  id: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  vehicle: {
    name: string;
    type: string;
  };
  booking_date: string;
  duration: {
    from: string;
    to: string;
  };
  pickup_location: string;
  dropoff_location: string;
  amount: string;
  status: string;
  payment_status: string;
}

interface BookingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking;
}

export default function BookingDetailsModal({
  isOpen,
  onClose,
  booking
}: BookingDetailsModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    Booking Details
                  </Dialog.Title>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-500"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                <div className="mt-4 space-y-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Customer Information</h4>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-gray-900">Name: {booking.customer.name}</p>
                      <p className="text-sm text-gray-900">Email: {booking.customer.email}</p>
                      <p className="text-sm text-gray-900">Phone: {booking.customer.phone}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Vehicle Information</h4>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-gray-900">Name: {booking.vehicle.name}</p>
                      <p className="text-sm text-gray-900">Type: {booking.vehicle.type}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Booking Information</h4>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-gray-900">Booking Date: {booking.booking_date}</p>
                      <p className="text-sm text-gray-900">From: {booking.duration.from}</p>
                      <p className="text-sm text-gray-900">To: {booking.duration.to}</p>
                      <p className="text-sm text-gray-900">Amount: {booking.amount}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Location Information</h4>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-gray-900">Pickup Location: {booking.pickup_location}</p>
                      <p className="text-sm text-gray-900">Dropoff Location: {booking.dropoff_location}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Status</h4>
                    <div className="mt-2 flex space-x-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                        ${booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                          booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          booking.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'}`}>
                        {booking.status}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                        ${booking.payment_status === 'completed' ? 'bg-green-100 text-green-800' :
                          booking.payment_status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'}`}>
                        {booking.payment_status}
                      </span>
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 