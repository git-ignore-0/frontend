export type Locale = "vi" | "en";
export type Screen = "home" | "about" | "workshops" | "plants" | "animals" | "tracker" | "testimonials" | "store" | "product" | "checkout" | "account" | "csa" | "order-detail" | "success";
export type AccountTab = "orders" | "address" | "profile" | "csa" | "rewards" | "redeem" | "referrals";
export type Resource = "csa" | "rewards" | "referrals";
export type FetchStatus = "loading" | "ready" | "error";
export interface Product { id: string; name: string; en: string; price: number; cat: string; categoryId: string; unit: string; farm: string; image: string; description: string; note: string; csa: boolean }
export interface Category { id: string; name: string; parentId?: string | null; children?: Category[] }
export interface Address { id?: string; name: string; phone: string; city: string; ward: string; detail: string; address?: string; isDefault?: boolean }
export interface Profile { name: string; phone: string; email: string; dateOfBirth: string | null }
export interface Recipient extends Address { note: string }
export interface OrderLine { id?: string; name: string; qty: number; price: number; unit: string }
export interface Order { id: string; date: string; status: string; count: number; lines: OrderLine[]; subtotal: number; saved: number; credits: number; total: number; name: string; phone: string; address: string; shipping: string }
export interface PageMeta { total?: number | null; nextCursor?: string | null }
export interface Paged<T> { items: T[]; total?: number | null; nextCursor?: string | null }
export interface RewardEntry { id: string; date: string; description?: string; descriptionEn?: string; giftName?: string; giftNameEn?: string; points: number; status?: string }
export interface Gift { id: string; name: string; nameEn?: string; image?: string; points: number }
export interface Rewards { balance?: number | null; gifts?: Gift[]; history?: RewardEntry[]; redemptions?: RewardEntry[]; pagination?: { points?: PageMeta; redemptions?: PageMeta; gifts?: PageMeta } }
export interface ReferralPerson { id?: string; code?: string; name?: string; linkedAt?: string }
export interface Invitee { id: string; name?: string; maskedName?: string; label?: string; status: string; date: string }
export interface Referrals { code?: string; canEnterReferrer?: boolean; referrer?: ReferralPerson | null; invitedCount?: number; invitees?: Invitee[]; history?: Invitee[]; terms?: string; termsEn?: string; pagination?: {invitees?: PageMeta; referrals?: PageMeta} }
export interface CSAQuota {productName?: string; productNameEn?: string; name?: string; total: number; remaining: number; unit?: string; unitEn?: string}
export interface CSAPayment {id: string; date?: string; dueDate?: string; amount: number; status: string; method?: string; methodEn?: string}
export interface CSAUsage {id?: string; date: string; orderId?: string; productName: string; productNameEn?: string; quantity: number; unit?: string; unitEn?: string}
export interface CSA {planName: string; planNameEn?: string; status: string; startDate?: string; endDate?: string; contract?: {number?: string; signedAt?: string; downloadUrl?: string}; quotas?: CSAQuota[]; paymentSchedule?: CSAPayment[]; payments?: CSAPayment[]; usage?: CSAUsage[]; history?: CSAUsage[]}
export interface Session {authenticated?: boolean; hasCSA?: boolean; profile?: Partial<Profile>}
export interface CatalogData {products: Product[]; categories: Category[]; provinces: string[]; wards: Record<string, string[]>; orders: Order[]; addresses: Address[]; profile: Profile; authenticated: boolean; hasCSA: boolean; csa: CSA | null; rewards: Rewards | null; referrals: Referrals | null}
export interface Backend {
 getProvinces?(): Promise<unknown>; getWards?(province: string): Promise<unknown>;
 getAddress?(): Promise<Address | null>; getOrders?(): Promise<Order[]>;
 getCSA?(): Promise<CSA | null>; getRewards?(): Promise<Rewards | null>; getReferrals?(): Promise<Referrals | null>;
 getRewardGiftsPage?(arg:{cursor:string;limit:number}):Promise<Paged<Gift>>;
 getRewardHistoryPage?(arg:{type:"points"|"redemptions";cursor:string;limit:number}):Promise<Paged<RewardEntry>>;
 getReferralsPage?(arg:{cursor:string;limit:number}):Promise<Paged<Invitee>>;
 saveAddress?(arg:Address):Promise<Address | void>;
 applyReferralCode?(arg:{code:string}):Promise<{referrer:ReferralPerson;canEnterReferrer:boolean}>;
 redeemGift?(arg:{giftId:string;idempotencyKey:string}):Promise<{accepted:boolean;rewards?:Rewards;balance?:number;redemption?:RewardEntry}>;
 validateCoupon?(arg:unknown):Promise<{valid:boolean;amount:number;message?:string}>; applyCoupon?(arg:unknown):Promise<unknown>; quoteOrder?(arg:unknown):Promise<unknown>;
 placeOrder?(arg:unknown):Promise<Order>;
}
declare global {interface Window { NFV_BACKEND?: Backend }}
