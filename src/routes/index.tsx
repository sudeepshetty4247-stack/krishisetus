import { createFileRoute } from '@tanstack/react-router';
import { HomePage, pageHead } from '@/components/krishisetu';
export const Route = createFileRoute('/')({ head:()=>pageHead('India agricultural dashboard','Kannada-first agricultural intelligence across India, with Dharwad as a detailed research case study.'),component:HomePage });
