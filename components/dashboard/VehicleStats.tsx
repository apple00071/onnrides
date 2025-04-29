import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CarFront, Bike } from "lucide-react";

interface VehicleStatsProps {
  data: {
    totalVehicles: number;
    availableVehicles: number;
  };
}

export function VehicleStats({ data }: VehicleStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Vehicles</CardTitle>
          <CarFront className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.totalVehicles}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Available</CardTitle>
          <Bike className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.availableVehicles}</div>
        </CardContent>
      </Card>
    </div>
  );
} 