import { createFileRoute } from '@tanstack/react-router';
import { HomePage, pageHead } from '@/components/krishisetu';
export const Route = createFileRoute('/')({ head:()=>pageHead('Your harvest, informed decisions','Kannada-first agricultural market intelligence for farmers in Dharwad, Karnataka.'),component:HomePage });
