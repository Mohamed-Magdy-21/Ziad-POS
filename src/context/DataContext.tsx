 "use client";
 
import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
 
 export type Product = {
   id: string;
   productCode: string;
   name: string;
   price: number;
   stockQuantity: number;
 };
 
 export type SoldItem = {
   productId: string;
   productCode: string;
   name: string;
   quantity: number;
   price: number;
 };
 
 export type Sale = {
   id: string;
   date: string;
   subtotal: number;
   tax: number;
   totalAmount: number;
   soldItems: SoldItem[];
 };
 
 type RecordSalePayload = {
   soldItems: SoldItem[];
   subtotal: number;
   tax: number;
   totalAmount: number;
 };
 
 type DataContextValue = {
   products: Product[];
   sales: Sale[];
   addProduct: (product: Omit<Product, "id">) => string;
   updateProduct: (id: string, updates: Partial<Omit<Product, "id">>) => void;
  deleteProduct: (id: string) => void;
   adjustStock: (id: string, delta: number) => void;
   recordSale: (payload: RecordSalePayload) => string;
   dataReady: boolean;
 };
 
 const STORAGE_KEY = "pos-data-v1";
 
const defaultProducts: Product[] = [
  {
    id: "sample-espresso",
    productCode: "ESP-1001",
    name: "Espresso Shot",
    price: 3.0,
    stockQuantity: 30,
  },
   {
     id: "sample-cappuccino",
     productCode: "CAP-2002",
     name: "Cappuccino",
     price: 4.5,
     stockQuantity: 24,
   },
   {
     id: "sample-bagel",
     productCode: "BG-3003",
     name: "Fresh Bagel",
     price: 2.25,
     stockQuantity: 50,
   },
 ];
 
 const DataContext = createContext<DataContextValue | undefined>(undefined);
 
 const generateId = () =>
   typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
     ? crypto.randomUUID()
     : Math.random().toString(36).slice(2, 9);
 
 export function DataProvider({ children }: { children: React.ReactNode }) {
   const [products, setProducts] = useState<Product[]>([]);
   const [sales, setSales] = useState<Sale[]>([]);
   const [ready, setReady] = useState(false);
 
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const hydrateState = (nextProducts: Product[], nextSales: Sale[]) => {
      startTransition(() => {
        setProducts(nextProducts);
        setSales(nextSales);
        setReady(true);
      });
    };

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as {
          products?: Product[];
          sales?: Sale[];
        };
        hydrateState(
          parsed.products?.length ? parsed.products : defaultProducts,
          parsed.sales ?? []
        );
        return;
      } catch (error) {
        console.error("Failed to parse stored POS data", error);
      }
    }

    hydrateState(defaultProducts, []);
  }, []);
 
   useEffect(() => {
     if (!ready || typeof window === "undefined") {
       return;
     }
 
     const payload = JSON.stringify({ products, sales });
     localStorage.setItem(STORAGE_KEY, payload);
   }, [products, sales, ready]);
 
   const addProduct = useCallback(
     (product: Omit<Product, "id">) => {
       const id = generateId();
       setProducts((prev) => [...prev, { ...product, id }]);
       return id;
     },
     []
   );
 
   const updateProduct = useCallback(
     (id: string, updates: Partial<Omit<Product, "id">>) => {
       setProducts((prev) =>
         prev.map((product) =>
           product.id === id ? { ...product, ...updates } : product
         )
       );
     },
     []
   );
 
   const adjustStock = useCallback((id: string, delta: number) => {
     setProducts((prev) =>
       prev.map((product) =>
         product.id === id
           ? {
               ...product,
               stockQuantity: Math.max(product.stockQuantity + delta, 0),
             }
           : product
       )
     );
   }, []);
 
  const deleteProduct = useCallback((id: string) => {
    setProducts((prev) => prev.filter((product) => product.id !== id));
  }, []);

   const recordSale = useCallback((sale: RecordSalePayload) => {
     const id = generateId();
     const payload: Sale = {
       ...sale,
       id,
       date: new Date().toISOString(),
     };
     
     // Update state
     setSales((prev) => {
       const updated = [payload, ...prev];
       
       // Immediately save to localStorage to ensure data is available for navigation
       if (typeof window !== "undefined" && ready) {
         try {
           const currentData = localStorage.getItem(STORAGE_KEY);
           let currentProducts = products;
           
           if (currentData) {
             try {
               const parsed = JSON.parse(currentData);
               if (parsed.products?.length) {
                 currentProducts = parsed.products;
               }
             } catch (e) {
               // Use current products state if parsing fails
             }
           }
           
           const toSave = JSON.stringify({
             products: currentProducts,
             sales: updated,
           });
           localStorage.setItem(STORAGE_KEY, toSave);
         } catch (error) {
           console.error("Failed to save sale to localStorage", error);
         }
       }
       
       return updated;
     });
     
     return id;
   }, [products, ready]);
 
   const value = useMemo<DataContextValue>(
     () => ({
       products,
       sales,
       addProduct,
       updateProduct,
      deleteProduct,
       adjustStock,
       recordSale,
       dataReady: ready,
     }),
    [
      products,
      sales,
      addProduct,
      updateProduct,
      deleteProduct,
      adjustStock,
      recordSale,
      ready,
    ]
   );
 
   return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
 }
 
 export function useData() {
   const ctx = useContext(DataContext);
   if (!ctx) {
     throw new Error("useData must be used within a DataProvider");
   }
   return ctx;
 }

