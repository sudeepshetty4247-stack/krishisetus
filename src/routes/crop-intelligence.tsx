import {createFileRoute} from '@tanstack/react-router';
import {IntelligencePage,pageHead} from '@/components/krishisetu';
export const Route=createFileRoute('/crop-intelligence')({head:()=>pageHead('Crop intelligence','Historical agricultural observations, varieties, trends and Python analyses.'),component:IntelligencePage});