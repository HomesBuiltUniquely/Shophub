export interface QuoteItemModel {
  id?: number;
  prodId: number;
  offeringName: string;
  category?: string;
  skuId?: string;
  room: string;
  quantity: number;
  unitPrice: number;
  originalPrice?: number;
  totalPrice?: number;
  costPrice?: number;
  imageUrl?: string;
  shortDesc?: string;
  longDesc?: string;
}

export interface QuoteModel {
  id?: number;
  quoteNumber?: string;
  customerId?: number;
  customerName?: string;
  projectId?: number;
  projectName?: string;
  currentRoom?: string;
  validityPeriod?: string;
  internalNotes?: string;
  subtotal: number;
  discountPercentage?: number;
  totalDiscount?: number;
  discountType?: 'percentage' | 'amount';
  discountValue?: number;
  freightPercentage?: number;
  estimatedFreight?: number;
  grandTotal: number;
  designerMarginPercentage?: number;
  designerMarginAmount?: number;
  projectedProfit?: number;
  status?: string;
  items: QuoteItemModel[];
}

export interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
}

export interface Project {
  id: number;
  projectName: string;
  customerId?: number;
  status?: string;
  leadId?: string | number;
  leadType?: string;
  leadIdentifier?: string;
}

export interface Room {
  id: number;
  roomName: string;
  projectId?: number;
  units?: string[];
  falseCeilingRequired?: boolean;
  notes?: string | null;
}
