'use client';

import { FaqItemProps } from './types';

const FaqItem = ({ question, answer }: FaqItemProps) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold mb-2">{question}</h3>
      <p className="text-gray-600">{answer}</p>
    </div>
  );
}

export default FaqItem; 