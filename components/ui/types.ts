export interface DateTimePickerProps {
  label: string;
  date: string;
  time: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
}

export interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  iconBgColor?: string;
  iconSize?: number;
}

export interface ReviewCardProps {
  customerName: string;
  customerImage: string;
  rating: number;
  review: string;
}

export interface FaqItemProps {
  question: string;
  answer: string;
} 