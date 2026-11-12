import {createFileRoute} from '@tanstack/react-router';
import {ForecastPage,pageHead} from '@/components/krishisetu';
export const Route=createFileRoute('/forecast')({head:()=>pageHead('Crop price outlook','Historical crop prices and transparent forecast availability.'),component:ForecastPage});