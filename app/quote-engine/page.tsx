'use client';

import React, { Suspense, useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import TopHeader from '@/components/layout/TopHeader';
import QuoteContextSidebar from '@/components/quote-engine/QuoteContextSidebar';
import QuoteCatalogSection, { CatalogProduct } from '@/components/quote-engine/QuoteCatalogSection';
import QuoteSidebar from '@/components/quote-engine/QuoteSidebar';
import QuoteBottomBar from '@/components/quote-engine/QuoteBottomBar';
import { getAllPrimaryCategories, getAllSecondaryCategories } from '@/lib/api/category.service';
import { getAllProducts } from '@/lib/api/product.service';
import { decodeUniqueCrmId, QuoteCustomer, QuoteProject } from '@/lib/api/leads.service';
import { getRequirementScope, transformScopeToRooms } from '@/lib/api/requirement-scope.service';
import { useAuthSession } from '@/lib/auth/useCurrentUser';
import QuoteInvoiceSheet from '@/components/quote-engine/QuoteInvoiceSheet';
import { invoiceSharePath, saveSharedQuote } from '@/lib/quote/share-snapshot';

// Local UI-only Interfaces
export interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  customerId?: string;
  realName?: string;
  crmLeadId?: number;
}

export interface Project {
  id: number;
  projectName: string;
  customerId?: number;
  status?: string;
  leadId?: string;
  leadType?: string;
  crmLeadId?: number;
}

export interface Room {
  id: number;
  roomName: string;
  projectId?: number;
  units?: string[];
  falseCeilingRequired?: boolean;
  notes?: string | null;
}

export interface QuoteItemModel {
  id: number;
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
}

export interface QuoteModel {
  id: number;
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

interface RawProductData {
  prodId?: number | string;
  offering_name?: string;
  category?: string;
  sku_id?: string;
  brand?: string;
  description?: string;
  pricing?: {
    selling_price?: number;
    cost_price?: number;
    margin_percentage?: number;
  };
  inventory?: {
    current_stock?: number;
    minimum_stock_level?: number;
  };
  media?: {
    primary_image?: string;
  };
  lead_time?: number;
  [key: string]: unknown;
}

interface RawCategoryData {
  primaryCategoryName?: string;
  secondaryCategoryName?: string;
  products?: RawProductData[] | unknown[];
  [key: string]: unknown;
}

// ============================================================================
// Helper to compute quote metrics
// ============================================================================
const computeTotals = (
  items: QuoteItemModel[],
  discountValue = 0,
  freightPct = 0,
  discountType: 'percentage' | 'amount' = 'percentage'
) => {
  const subtotal = items.reduce((sum, item) => sum + (item.totalPrice || item.unitPrice * item.quantity), 0);
  const totalCost = items.reduce((sum, item) => sum + ((item.costPrice || 0) * item.quantity), 0);

  let totalDiscount = 0;
  let discountPercentage = 0;

  if (discountType === 'amount') {
    totalDiscount = Math.min(subtotal, Math.max(0, Math.round(discountValue)));
    discountPercentage = subtotal > 0 ? Number(((totalDiscount / subtotal) * 100).toFixed(2)) : 0;
  } else {
    discountPercentage = Math.min(100, Math.max(0, discountValue));
    totalDiscount = Math.round(subtotal * (discountPercentage / 100));
  }

  const netSubtotal = Math.max(0, subtotal - totalDiscount);
  // Estimated freight (default 0)
  const estimatedFreight = items.length > 0 && netSubtotal > 0 && freightPct > 0 ? Math.round(netSubtotal * (freightPct / 100)) : 0;
  const grandTotal = Math.max(0, subtotal - totalDiscount + estimatedFreight);
  const projectedProfit = Math.max(0, (subtotal - totalDiscount) - totalCost);
  const designerMarginPercentage = subtotal > 0 ? Number(((projectedProfit / subtotal) * 100).toFixed(1)) : 24.5;
  const designerMarginAmount = projectedProfit;

  return {
    subtotal,
    discountPercentage,
    totalDiscount,
    discountType,
    discountValue,
    freightPercentage: freightPct,
    estimatedFreight,
    grandTotal,
    projectedProfit,
    designerMarginPercentage,
    designerMarginAmount,
  };
};

function QuoteEngineContent() {
  const { user, loading: authLoading } = useAuthSession();
  const searchParams = useSearchParams();

  // Role detection: URL param takes priority (for testing/portal redirection), then user session role, default admin
  const effectiveRole = useMemo(() => {
    const paramRole = searchParams?.get('role')?.toLowerCase();
    if (paramRole === 'crm' || paramRole === 'designer' || paramRole === 'admin' || paramRole === 'enterprise') {
      return paramRole;
    }
    const source = searchParams?.get('source')?.toLowerCase();
    if (source === 'crm') return 'crm';
    if (source === 'design' || source === 'designer') return 'designer';
    if (user?.role) return user.role;
    return 'admin';
  }, [user, searchParams]);

  const isAdmin = effectiveRole === 'admin';
  const isEnterprise = effectiveRole === 'enterprise';
  const isCrm = effectiveRole === 'crm';
  const isDesigner = effectiveRole === 'designer';
  // Custom discount is allowed for all roles (no preset 5/10/15% buttons)
  const canEditDiscount = true;


  // Navigation & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Customer, Project, Room State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);

  const [validityPeriod, setValidityPeriod] = useState<string>('30 Days (Standard)');
  const [internalNotes, setInternalNotes] = useState<string>(
    'Client requested brushed brass finish for all hardware and fittings.'
  );

  // Quote State - 0% initial discount (only custom is allowed) and 0% freight
  const initialTotals = computeTotals([], 0, 0);
  const [quote, setQuote] = useState<QuoteModel>({
    id: 1,
    quoteNumber: 'QTE-2026-1001',
    customerId: undefined,
    customerName: undefined,
    projectId: undefined,
    projectName: undefined,
    currentRoom: '',
    validityPeriod: '30 Days (Standard)',
    internalNotes: '',
    items: [],
    ...initialTotals,
  });

  // Products State - Load from API
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  // Quote Sidebar State - Only show when user clicks shopping cart
  const [isQuoteSidebarOpen, setIsQuoteSidebarOpen] = useState(false);
  
  // Calculate cart item count for the shopping cart badge
  const cartItemCount = quote.items.reduce((sum, item) => sum + item.quantity, 0);

  // UI Feedback / Alerts
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSavingForClient, setIsSavingForClient] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);

  // ============================================================================
  // Load data from APIs on mount
  // ============================================================================
  
  // ============================================================================
  // Handle URL parameters for adding items from other pages
  // ============================================================================
  useEffect(() => {
    const handleURLParams = () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const shouldAddToCart = urlParams.get('addToCart');
        
        if (shouldAddToCart === 'true') {
          const prodId = urlParams.get('prodId');
          const offeringName = urlParams.get('offeringName');
          const price = urlParams.get('price');
          
          if (prodId && offeringName && price) {
            const priceNum = parseFloat(price);
            const costNum = parseFloat(urlParams.get('cost') || '0');
            const room = selectedRoom || 'Kitchen Island';

            setQuote((prev) => {
              const newItem: QuoteItemModel = {
                id: Date.now(),
                prodId: parseInt(prodId),
                offeringName: offeringName,
                category: urlParams.get('category') || 'GENERAL',
                skuId: urlParams.get('skuId') || '',
                room,
                quantity: 1,
                unitPrice: priceNum,
                originalPrice: priceNum,
                totalPrice: priceNum,
                costPrice: costNum,
                imageUrl: urlParams.get('image') || 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400',
              };

              const updatedItems = [...prev.items, newItem];
              const totals = computeTotals(
                updatedItems,
                prev.discountValue ?? prev.discountPercentage ?? 0,
                0,
                prev.discountType ?? 'percentage'
              );

              return {
                ...prev,
                items: updatedItems,
                ...totals,
              };
            });
            
            // Open the quote sidebar automatically
            setIsQuoteSidebarOpen(true);
            
            // Clean up URL parameters
            window.history.replaceState({}, '', window.location.pathname);
            
            // Show success message
            setToastMessage(`Added "${offeringName}" to your quote!`);
            setTimeout(() => setToastMessage(''), 3000);
          }
        }
      } catch {
        // Silently handle URL parameter errors
      }
    };

    setTimeout(handleURLParams, 100);
  }, [selectedRoom]);

  // ============================================================================
  // Load data from APIs on mount
  // ============================================================================
  
  // Load customers + projects from leads API in one shot based on role/bucket
  useEffect(() => {
    // Enterprise users must NOT see or load customer context
    if (isEnterprise) {
      setIsLoadingProjects(false);
      return;
    }

    if (authLoading) return;

    const loadFromLeads = async () => {
      try {
        setIsLoadingProjects(true);
        const res = await fetch('/api/quote/bucket');
        const bucketData: { customers: QuoteCustomer[]; projects: QuoteProject[] } = res.ok
          ? await res.json()
          : { customers: [], projects: [] };

        setCustomers(bucketData.customers || []);
        setProjects(bucketData.projects || []);

        if (bucketData.customers.length > 0) {
          const paramLeadId = searchParams?.get('leadId') ? Number(searchParams.get('leadId')) : null;
          const targetCustomer = (paramLeadId ? bucketData.customers.find((c) => c.id === paramLeadId) : null) || bucketData.customers[0];

          setSelectedCustomerId(targetCustomer.id);
          const matchingProj = bucketData.projects.find((p) => p.customerId === targetCustomer.id) || bucketData.projects[0];
          if (matchingProj) {
            setSelectedProjectId(matchingProj.id);
            setQuote((prev) => ({
              ...prev,
              customerId: targetCustomer.id,
              customerName: targetCustomer.name,
              projectId: matchingProj.id,
              projectName: matchingProj.projectName,
            }));
          }
        }
      } catch (err) {
        console.error('Failed to load bucket leads:', err);
      } finally {
        setIsLoadingProjects(false);
      }
    };

    loadFromLeads();
  }, [authLoading, isEnterprise, isCrm, isDesigner, user, searchParams]);

  // ============================================================================
  // Load Requirement Scope & Rooms from CRM API whenever active project changes
  // ============================================================================
  useEffect(() => {
    if (!selectedProjectId) return;

    const loadRoomsFromScope = async () => {
      try {
        const currentProject = projects.find((p) => p.id === selectedProjectId);
        const decoded = decodeUniqueCrmId(selectedProjectId);
        const leadType = currentProject?.leadType || decoded.leadType;
        const crmLeadId = currentProject?.crmLeadId || decoded.crmLeadId;
        const scopeData = await getRequirementScope(crmLeadId, leadType);
        const transformedRooms = transformScopeToRooms(scopeData, crmLeadId);

        if (transformedRooms.length > 0) {
          setRooms(transformedRooms);
          setSelectedRoom((prevRoom) => {
            const exists = transformedRooms.some(
              (r) => r.roomName.toLowerCase() === prevRoom.toLowerCase()
            );
            const nextRoom = exists && prevRoom ? prevRoom : transformedRooms[0].roomName;
            setQuote((prev) => ({ ...prev, currentRoom: nextRoom }));
            return nextRoom;
          });
        }
      } catch (err) {
        console.error('Failed to load requirement scope for project:', err);
      }
    };

    loadRoomsFromScope();
  }, [selectedProjectId, projects]);

  // Load products from API
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setIsLoadingProducts(true);
        
        // Call both primary and secondary categories APIs
        const [primaryResponse, secondaryResponse] = await Promise.all([
          getAllPrimaryCategories(),
          getAllSecondaryCategories(),
        ]);

        // Extract products from both responses and deduplicate by prodId
        const productsMap = new Map<number, CatalogProduct>();

        // Process primary categories
        if (Array.isArray(primaryResponse)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          primaryResponse.forEach((category: any) => {
            if (category.products && Array.isArray(category.products)) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              category.products.forEach((product: any) => {
                const numId = typeof product.prodId === 'string' ? parseInt(product.prodId, 10) : product.prodId;
                if (numId && !productsMap.has(numId)) {
                  productsMap.set(numId, {
                    prodId: numId || 0,
                    offering_name: product.offering_name || 'Unknown Product',
                    category: product.category || category.primaryCategoryName || 'GENERAL',
                    sku_id: product.sku_id || '',
                    brand: product.brand || '',
                    short_desc: product.description || '',
                    pricing: {
                      selling_price: product.pricing?.selling_price || 0,
                      cost_price: product.pricing?.cost_price || 0,
                      margin_percentage: product.pricing?.margin_percentage || 0,
                    },
                    inventory: {
                      current_stock: product.inventory?.current_stock || 0,
                      minimum_stock_level: product.inventory?.minimum_stock_level || 0,
                    },
                    media: {
                      primary_image: product.media?.primary_image || '',
                    },
                    lead_time: product.lead_time || 0,
                  });
                }
              });
            }
          });
        }

        // Process secondary categories
        if (Array.isArray(secondaryResponse)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          secondaryResponse.forEach((category: any) => {
            if (category.products && Array.isArray(category.products)) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              category.products.forEach((product: any) => {
                const numId = typeof product.prodId === 'string' ? parseInt(product.prodId, 10) : product.prodId;
                if (numId && !productsMap.has(numId)) {
                  productsMap.set(numId, {
                    prodId: numId || 0,
                    offering_name: product.offering_name || 'Unknown Product',
                    category: product.category || category.secondaryCategoryName || 'GENERAL',
                    sku_id: product.sku_id || '',
                    brand: product.brand || '',
                    short_desc: product.description || '',
                    pricing: {
                      selling_price: product.pricing?.selling_price || 0,
                      cost_price: product.pricing?.cost_price || 0,
                      margin_percentage: product.pricing?.margin_percentage || 0,
                    },
                    inventory: {
                      current_stock: product.inventory?.current_stock || 0,
                      minimum_stock_level: product.inventory?.minimum_stock_level || 0,
                    },
                    media: {
                      primary_image: product.media?.primary_image || '',
                    },
                    lead_time: product.lead_time || 0,
                  });
                }
              });
            }
          });
        }

        let loadedProducts = Array.from(productsMap.values());
        if (loadedProducts.length === 0) {
          const page = await getAllProducts(0, 100);
          loadedProducts = (page.content || []).map((product: any) => {
            const numId = typeof product.prodId === 'string' ? parseInt(product.prodId, 10) : product.prodId;
            return {
              prodId: numId || 0,
              offering_name: product.offering_name || 'Unknown Product',
              category: product.category || 'GENERAL',
              sku_id: product.sku_id || '',
              brand: product.brand || '',
              short_desc: product.short_desc || product.description || '',
              pricing: {
                selling_price: product.pricing?.selling_price || 0,
                cost_price: product.pricing?.cost_price || 0,
                margin_percentage: product.pricing?.margin_percentage || 0,
              },
              inventory: {
                current_stock: product.inventory?.current_stock || 0,
                minimum_stock_level: product.inventory?.minimum_stock_level || 0,
              },
              media: {
                primary_image: product.media?.primary_image || '',
              },
              lead_time: product.lead_time || 0,
            };
          });
        }
        setProducts(loadedProducts);
      } catch (error) {
        console.error('Failed to load products:', error);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    loadProducts();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Filter products by search query and selected unit from CRM requirement scope
  const searchedProducts = useMemo(() => {
    let list = products;
    if (selectedUnit) {
      const u = selectedUnit.toLowerCase();
      const filtered = list.filter(
        (p) =>
          p.offering_name.toLowerCase().includes(u) ||
          (p.category && p.category.toLowerCase().includes(u)) ||
          (p.sku_id && p.sku_id.toLowerCase().includes(u)) ||
          (p.short_desc && p.short_desc.toLowerCase().includes(u))
      );
      if (filtered.length > 0) {
        list = filtered;
      }
    }
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (p) =>
        p.offering_name.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.sku_id && p.sku_id.toLowerCase().includes(q)) ||
        (p.short_desc && p.short_desc.toLowerCase().includes(q))
    );
  }, [products, searchQuery, selectedUnit]);

  // ============================================================================
  // UI-ONLY HANDLERS (No API Calls)
  // ============================================================================

  const handleSelectCustomer = (id: number) => {
    setSelectedCustomerId(id);
    const selected = customers.find((c) => c.id === id);
    setQuote((prev) => ({
      ...prev,
      customerId: id,
      customerName: selected?.name,
    }));
    const matchingProject = projects.find((p) => p.customerId === id || p.id === id);
    if (matchingProject) {
      setSelectedProjectId(matchingProject.id);
      setSelectedUnit(null);
      setQuote((prev) => ({
        ...prev,
        projectId: matchingProject.id,
        projectName: matchingProject.projectName,
      }));
    }
  };

  const handleSelectProject = (id: number) => {
    setSelectedProjectId(id);
    setSelectedUnit(null);
    const selected = projects.find((p) => p.id === id);
    setQuote((prev) => ({
      ...prev,
      projectId: id,
      projectName: selected?.projectName,
    }));
    const matchingCustomer = customers.find((c) => c.id === id || (selected?.customerId && c.id === selected.customerId));
    if (matchingCustomer) {
      setSelectedCustomerId(matchingCustomer.id);
      setQuote((prev) => ({
        ...prev,
        customerId: matchingCustomer.id,
        customerName: matchingCustomer.name,
      }));
    }
  };

  const handleUpdateDiscount = (value: number, mode: 'percentage' | 'amount' = 'percentage') => {
    if (!canEditDiscount) {
      setToastMessage('Only CRM, Design team, and Administrators are authorized to modify discounts.');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    setQuote((prev) => {
      const freightPct = prev.freightPercentage ?? 0;
      const totals = computeTotals(prev.items, value, freightPct, mode);
      return {
        ...prev,
        ...totals,
      };
    });
    setToastMessage(mode === 'amount' ? `Discount updated to ₹${value.toLocaleString('en-IN')}.` : `Discount updated to ${value}%.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleUpdateFreight = (newFreightPct: number) => {
    if (!canEditDiscount) {
      setToastMessage('Only CRM, Design team, and Administrators are authorized to modify freight.');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    setQuote((prev) => {
      const discountPct = prev.discountPercentage ?? 0;
      const totals = computeTotals(prev.items, discountPct, newFreightPct);
      return {
        ...prev,
        ...totals,
      };
    });
    setToastMessage(`Estimated freight updated to ${newFreightPct}%.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSelectRoom = (roomName: string) => {
    setSelectedRoom(roomName);
    setSelectedUnit(null);
    setQuote((prev) => ({
      ...prev,
      currentRoom: roomName,
    }));
  };

  const handleAddRoom = (newRoomName: string) => {
    const newRoom: Room = {
      id: Date.now(),
      roomName: newRoomName,
      projectId: selectedProjectId || undefined,
    };
    setRooms((prev) => [...prev, newRoom]);
    setSelectedRoom(newRoomName);
    setQuote((prev) => ({
      ...prev,
      currentRoom: newRoomName,
    }));
    showToast(`Room "${newRoomName}" added!`);
  };

  const handleValidityChange = (val: string) => {
    setValidityPeriod(val);
    setQuote((prev) => ({
      ...prev,
      validityPeriod: val,
    }));
  };

  const handleNotesChange = (notes: string) => {
    setInternalNotes(notes);
    setQuote((prev) => ({
      ...prev,
      internalNotes: notes,
    }));
  };

  const handleAddToCart = (product: CatalogProduct, quantity: number = 1) => {
    const price = product.pricing?.selling_price || 0;
    const cost = product.pricing?.cost_price || 0;
    const room = selectedRoom || 'Kitchen Island';

    setQuote((prev) => {
      // Check if product already exists in the selected room
      const existingIndex = prev.items.findIndex(
        (item) => item.prodId === product.prodId && item.room === room
      );

      let updatedItems: QuoteItemModel[];
      if (existingIndex > -1) {
        // Increment quantity
        updatedItems = prev.items.map((item, idx) => {
          if (idx === existingIndex) {
            const newQty = item.quantity + quantity;
            return {
              ...item,
              quantity: newQty,
              totalPrice: item.unitPrice * newQty,
            };
          }
          return item;
        });
      } else {
        // Add new line item
        const newItem: QuoteItemModel = {
          id: Date.now(),
          prodId: product.prodId,
          offeringName: product.offering_name,
          category: product.category,
          skuId: product.sku_id,
          room,
          quantity,
          unitPrice: price,
          originalPrice: price,
          totalPrice: price * quantity,
          costPrice: cost,
          imageUrl: product.media?.primary_image || 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400',
        };
        updatedItems = [...prev.items, newItem];
      }

      const totals = computeTotals(
        updatedItems,
        prev.discountValue ?? prev.discountPercentage ?? 0,
        0,
        prev.discountType ?? 'percentage'
      );
      return {
        ...prev,
        items: updatedItems,
        ...totals,
      };
    });

    // Open the sidebar and confirm
    setIsQuoteSidebarOpen(true);
    showToast(`Added ${quantity}x "${product.offering_name}" to ${room}`);
  };

  const handleUpdateQuantity = (itemId: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(itemId);
      return;
    }

    setQuote((prev) => {
      const updatedItems = prev.items.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            quantity: newQty,
            totalPrice: item.unitPrice * newQty,
          };
        }
        return item;
      });

      const totals = computeTotals(
        updatedItems,
        prev.discountValue ?? prev.discountPercentage ?? 0,
        0,
        prev.discountType ?? 'percentage'
      );
      return {
        ...prev,
        items: updatedItems,
        ...totals,
      };
    });
  };

  const handleRemoveItem = (itemId: number) => {
    setQuote((prev) => {
      const updatedItems = prev.items.filter((item) => item.id !== itemId);
      const totals = computeTotals(
        updatedItems,
        prev.discountValue ?? prev.discountPercentage ?? 0,
        0,
        prev.discountType ?? 'percentage'
      );
      return {
        ...prev,
        items: updatedItems,
        ...totals,
      };
    });
    showToast('Item removed from quote');
  };

  const handleClearQuote = () => {
    if (confirm('Are you sure you want to clear all items in this quote?')) {
      setQuote((prev) => {
        const totals = computeTotals(
          [],
          prev.discountValue ?? prev.discountPercentage ?? 0,
          0,
          prev.discountType ?? 'percentage'
        );
        return {
          ...prev,
          items: [],
          ...totals,
        };
      });
      showToast('Quote cleared');
    }
  };

  const buildInvoiceSnapshot = () => {
    const customer = customers.find((c) => c.id === selectedCustomerId);
    const project = projects.find((p) => p.id === selectedProjectId);
    return {
      quote,
      customerName: customer?.name || quote.customerName,
      customerEmail: customer?.email,
      customerId: customer?.id,
      customerCode: customer?.customerId,
      source: 'staff' as const,
      projectName: project?.projectName || quote.projectName,
      leadId: project?.leadId ? String(project.leadId) : customer?.id ? String(customer.id) : undefined,
      validityPeriod,
      issuedBy: user?.name || 'Hub Interior',
    };
  };

  const persistOfferingsInvoice = async () => {
    const snapshot = buildInvoiceSnapshot();
    try {
      const res = await fetch('/api/quote/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(snapshot),
      });
      const data = await res.json().catch(() => ({}));
      const id = typeof data.id === 'string' ? data.id : saveSharedQuote(snapshot);
      saveSharedQuote(snapshot, id);
      return id;
    } catch {
      return saveSharedQuote(snapshot);
    }
  };

  const handleShareQuote = async () => {
    const id = await persistOfferingsInvoice();
    const path = invoiceSharePath(id);
    const url = `${window.location.origin}${path}`;
    navigator.clipboard?.writeText(url);
    window.open(path, '_blank', 'noopener,noreferrer');
    showToast('Invoice opened. Link copied to clipboard.');
  };

  const handleGeneratePdf = async () => {
    await persistOfferingsInvoice();
    setShowInvoice(true);
    setIsGeneratingPdf(false);
  };

  const handleSaveForClient = async () => {
    const customer = customers.find((c) => c.id === selectedCustomerId);
    const project = projects.find((p) => p.id === selectedProjectId);
    if (!customer) {
      showToast('Select a client in the left panel first.');
      return;
    }
    if (!quote.items.length) {
      showToast('Add products to the quote before saving for the client.');
      return;
    }
    setIsSavingForClient(true);
    try {
      const res = await fetch('/api/client/saved-offerings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          customerName: customer.realName || customer.name,
          customerEmail: customer.email,
          customerPhone: customer.phone,
          clientId: customer.customerId || project?.leadId,
          leadId: String(customer.id || project?.leadId || ''),
          pid: project?.leadId || customer.customerId,
          numericLeadId: customer.id,
          projectName: project?.projectName,
          items: quote.items,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Could not save offerings for this client.');
      }
      showToast(`Saved ${quote.items.length} offering(s) for ${customer.realName || customer.name}. They will see them in Client Portal → Offerings.`);
    } catch (err) {
      showToast((err as Error).message);
    } finally {
      setIsSavingForClient(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans select-none">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-16 right-8 z-50 bg-neutral-900 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2 animate-bounce">
          <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      <Sidebar />
      <TopHeader
        title="Quote Engine"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder="Search Global catalog..."
        extraActions={
          <button
            type="button"
            onClick={() => setIsQuoteSidebarOpen(!isQuoteSidebarOpen)}
            className={`relative p-2 rounded-md transition-colors ${
              isQuoteSidebarOpen ? 'bg-black text-white' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
            title="My Quote"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {cartItemCount > 0 && (
              <span className={`absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 grid place-items-center rounded-full text-[10px] font-bold ${isQuoteSidebarOpen ? 'bg-white text-black' : 'bg-black text-white'}`}>
                {cartItemCount}
              </span>
            )}
          </button>
        }
      />

      {/* Main Workspace with Three-Column Layout */}
      <div className="flex-1 flex w-full">
        {/* Left Column: Customer, Project & Room Context (Visible to Admin, CRM, and Design users - Hidden for Enterprise) */}
        {!isEnterprise && (
          <QuoteContextSidebar
            customers={customers}
            selectedCustomerId={selectedCustomerId}
            onSelectCustomer={handleSelectCustomer}
            projects={projects}
            selectedProjectId={selectedProjectId}
            onSelectProject={handleSelectProject}
            isLoadingProjects={isLoadingProjects}
            rooms={rooms}
            selectedRoom={selectedRoom}
            onSelectRoom={handleSelectRoom}
            onAddRoom={handleAddRoom}
            selectedUnit={selectedUnit}
            onSelectUnit={setSelectedUnit}
            validityPeriod={validityPeriod}
            onValidityChange={handleValidityChange}
            internalNotes={internalNotes}
            onNotesChange={handleNotesChange}
          />
        )}

        {/* Center Column: Interactive Catalog & Smart Suggestions */}
        <main className={`${isEnterprise ? 'ml-56' : 'ml-[30rem]'} ${isQuoteSidebarOpen ? 'mr-80' : 'mr-0'} pt-16 pb-24 flex-1 bg-white min-h-[calc(100vh-4rem-5rem)] overflow-y-auto transition-all duration-300`}>
          <QuoteCatalogSection
            products={searchedProducts}
            selectedCategory={selectedCategory}
            onSelectCategory={(cat) => setSelectedCategory(cat)}
            onAddToCart={handleAddToCart}
            isLoading={isLoadingProducts}
          />
        </main>

        {/* Right Column: Live Quote Sidebar - Only show when cart icon is clicked */}
        {isQuoteSidebarOpen && (
          <QuoteSidebar
            quote={quote}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onClearQuote={handleClearQuote}
            onClose={() => {
              setIsQuoteSidebarOpen(false);
            }}
            isAdmin={isAdmin}
            canEditDiscount={canEditDiscount}
            onUpdateDiscount={handleUpdateDiscount}
            onUpdateFreight={handleUpdateFreight}
          />
        )}
      </div>

      {/* Bottom Sticky Action Bar */}
      {showInvoice && (
        <QuoteInvoiceSheet
          quote={quote}
          customerName={customers.find((c) => c.id === selectedCustomerId)?.name || quote.customerName}
          projectName={projects.find((p) => p.id === selectedProjectId)?.projectName || quote.projectName}
          validityPeriod={validityPeriod}
          issuedBy={user?.name || 'Hub Interior'}
          onClose={() => setShowInvoice(false)}
          onPrint={() => window.print()}
        />
      )}

      <QuoteBottomBar
        grandTotal={quote.grandTotal}
        designerMarginPct={quote.designerMarginPercentage ?? 24.5}
        designerMarginAmount={quote.designerMarginAmount ?? 3802.0}
        projectedProfit={quote.projectedProfit ?? 5240.0}
        onShareQuote={handleShareQuote}
        onSaveForClient={handleSaveForClient}
        isSavingForClient={isSavingForClient}
        onGeneratePdf={handleGeneratePdf}
        isGeneratingPdf={isGeneratingPdf}
      />
    </div>
  );
}

export default function QuoteEnginePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-xs text-gray-400">Loading Quote Engine...</div>}>
      <QuoteEngineContent />
    </Suspense>
  );
}
