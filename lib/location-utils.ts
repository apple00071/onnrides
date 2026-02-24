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
    landmarks: string[];
    description: string;
  };
}

const locationData: LocationData = {
  madhapur: {
    address: "Madhapur Main Road, Hyderabad",
    postalCode: "500081",
    coordinates: { lat: 17.4484, lng: 78.3908 },
    nearbyAreas: ["Hitec City", "Jubilee Hills", "Gachibowli"],
    landmarks: ["Inorbit Mall", "IKEA Hyderabad", "Hitech City Metro", "Cyber Towers"],
    description: "Located in the heart of Hyderabad's IT hub, our Madhapur branch is easily accessible from Inorbit Mall and the Hitech City Metro station."
  },
  gachibowli: {
    address: "Gachibowli Main Road, Hyderabad",
    postalCode: "500032",
    coordinates: { lat: 17.4401, lng: 78.3489 },
    nearbyAreas: ["Madhapur", "Kondapur", "Nanakramguda"],
    landmarks: ["DLF Cyber City", "Gachibowli Stadium", "IIIT Hyderabad"],
    description: "Serving the financial district and surrounding tech parks, our Gachibowli location is perfect for corporate commuters."
  },
  "hitec-city": {
    address: "Hitec City Main Road, Hyderabad",
    postalCode: "500081",
    coordinates: { lat: 17.4435, lng: 78.3772 },
    nearbyAreas: ["Madhapur", "Gachibowli", "Kondapur"],
    landmarks: ["Cyber Gateway", "Novotel Convention Centre", "Shilparamam"],
    description: "Right next to the major IT parks and convention centers, ideal for business travelers and tech professionals."
  },
  erragadda: {
    address: "Erragadda Main Road, Hyderabad",
    postalCode: "500018",
    coordinates: { lat: 17.4489, lng: 78.4312 },
    nearbyAreas: ["SR Nagar", "Sanathnagar", "Ameerpet", "Moosapet"],
    landmarks: ["Erragadda Metro Station", "Gokul Theatre", "ESI Hospital", "Rythu Bazar"],
    description: "Conveniently situated near the Erragadda Metro (Pillar No. 955), making it a prime spot for commuters from SR Nagar and Ameerpet."
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

export function getLocationLandmarks(location: string): string[] {
  return locationData[location]?.landmarks || [];
}

export function getLocationDescription(location: string): string {
  return locationData[location]?.description || "";
}