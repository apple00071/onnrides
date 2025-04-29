interface LocationCoordinates {
  lat: number;
  lng: number;
}

interface LocationData {
  [key: string]: {
    address: string;
    postalCode: string;
    coordinates: LocationCoordinates;
    nearbyAreas: string[];
  };
}

const locationData: LocationData = {
  madhapur: {
    address: "Madhapur Main Road, Hyderabad",
    postalCode: "500081",
    coordinates: { lat: 17.4484, lng: 78.3908 },
    nearbyAreas: ["Hitec City", "Jubilee Hills", "Gachibowli"]
  },
  gachibowli: {
    address: "Gachibowli Main Road, Hyderabad",
    postalCode: "500032",
    coordinates: { lat: 17.4401, lng: 78.3489 },
    nearbyAreas: ["Madhapur", "Kondapur", "Nanakramguda"]
  },
  "hitec-city": {
    address: "Hitec City Main Road, Hyderabad",
    postalCode: "500081",
    coordinates: { lat: 17.4435, lng: 78.3772 },
    nearbyAreas: ["Madhapur", "Gachibowli", "Kondapur"]
  }
};

export function getLocationAddress(location: string): string {
  return locationData[location]?.address || "Hyderabad, Telangana";
}

export function getLocationPostalCode(location: string): string {
  return locationData[location]?.postalCode || "500032";
}

export function getLocationCoordinates(location: string): LocationCoordinates {
  return locationData[location]?.coordinates || { lat: 17.3850, lng: 78.4867 };
}

export function getNearbyAreas(location: string): string[] {
  return locationData[location]?.nearbyAreas || ["Madhapur", "Gachibowli", "Hitec City"];
} 