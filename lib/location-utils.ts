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
    nearbyAreas: ["Madhapur", "Kondapur", "Nanakramguda", "Kokapet"],
    landmarks: ["DLF Cyber City", "Gachibowli Stadium", "IIIT Hyderabad", "ISB (Indian School of Business)", "Microsoft Office", "IIT Hyderabad (Kandi)", "Wipro Circle"],
    description: "Serving the financial district and surrounding tech parks, our Gachibowli location is perfect for corporate commuters, students, and professionals working at Microsoft, Wipro, and ISB."
  },
  "hitec-city": {
    address: "Hitec City Main Road, Hyderabad",
    postalCode: "500081",
    coordinates: { lat: 17.4435, lng: 78.3772 },
    nearbyAreas: ["Madhapur", "Gachibowli", "Kondapur"],
    landmarks: ["Cyber Gateway", "Novotel Convention Centre", "Shilparamam", "L&T Next Galleria Mall"],
    description: "Right next to the major IT parks and convention centers, ideal for business travelers and tech professionals."
  },
  kondapur: {
    address: "Kondapur Main Road, Hyderabad",
    postalCode: "500084",
    coordinates: { lat: 17.4622, lng: 78.3568 },
    nearbyAreas: ["Gachibowli", "Madhapur", "Hafeezpet"],
    landmarks: ["Sarath City Capital Mall", "Botanical Garden", "Kondapur RTO", "Chirec International School"],
    description: "Centrally located near Botanical Garden and Sarath City Capital Mall, our Kondapur branch serves residents and commuters alike with convenient bike rentals."
  },
  "jubilee-hills": {
    address: "Road No. 36, Jubilee Hills, Hyderabad",
    postalCode: "500033",
    coordinates: { lat: 17.4312, lng: 78.4008 },
    nearbyAreas: ["Madhapur", "Banjara Hills", "Filmnagar"],
    landmarks: ["Jubilee Hills Check Post Metro", "KBR National Park", "Apollo Hospital", "Peddamma Temple"],
    description: "Situated in the upscale Jubilee Hills neighborhood, this branch offers easy access to Banjara Hills, Apollo Hospital, and nearby retail hubs."
  },
  erragadda: {
    address: "Erragadda Main Road, Hyderabad",
    postalCode: "500018",
    coordinates: { lat: 17.4489, lng: 78.4312 },
    nearbyAreas: ["SR Nagar", "Sanathnagar", "Ameerpet", "Moosapet"],
    landmarks: ["Erragadda Metro Station", "Gokul Theatre", "ESI Hospital", "Rythu Bazar"],
    description: "Conveniently situated near the Erragadda Metro (Pillar No. 955), making it a prime spot for commuters from SR Nagar and Ameerpet."
  },
  ameerpet: {
    address: "Ameerpet Road, Hyderabad",
    postalCode: "500016",
    coordinates: { lat: 17.4374, lng: 78.4482 },
    nearbyAreas: ["SR Nagar", "Panjagutta", "Begumpet", "Somajiguda"],
    landmarks: ["Ameerpet Metro Interchange", "Aditya Trade Center", "Kakatiya Mess", "Sarathi Studios"],
    description: "Located at one of Hyderabad's busiest hubs, our Ameerpet branch is perfect for students, job seekers, and daily commuters looking for affordable rentals."
  },
  "sr-nagar": {
    address: "Sanjeeva Reddy Nagar Main Road, Hyderabad",
    postalCode: "500038",
    coordinates: { lat: 17.4431, lng: 78.4414 },
    nearbyAreas: ["Ameerpet", "Erragadda", "Balkampet"],
    landmarks: ["SR Nagar Metro Station", "Umesh Chandra Statue", "SR Nagar Playground"],
    description: "Providing easy two-wheeler rentals in Sanjeeva Reddy Nagar, a popular residential and coaching center hub in Hyderabad."
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
