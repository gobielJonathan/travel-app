export type BillItem = { name: string; price: number; member: string; settled: boolean }
export type TripEvent = { id: string; day: number; time: string; title: string; place: string; tag: string; tone: string; coords: [number, number]; travelTime?: string; transport?: string; bill: BillItem[] }
export type TripDay = { label: string; date: string; month: string; count: number }
export type CrewMember = { initials: string; name: string; role: string; tone?: string }
