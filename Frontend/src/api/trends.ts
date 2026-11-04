import { api } from './client';
import type {
  ClassificationBreakdownItem, NarrativeItem,
  PlatformIngestionItem, LanguageDistributionItem,
  DailyMisinformationItem, DailyBreakdownItem,
} from '../types/api';

export const trendsApi = {
  classificationBreakdown: (days = 7) =>
    api.get<ClassificationBreakdownItem[]>('/trends/classification-breakdown', { params: { days } }).then((r) => r.data),

  topNarratives: (days = 7, limit = 10) =>
    api.get<NarrativeItem[]>('/trends/top-narratives', { params: { days, limit } }).then((r) => r.data),

  platformIngestion: () =>
    api.get<PlatformIngestionItem[]>('/trends/platform-ingestion').then((r) => r.data),

  languageDistribution: () =>
    api.get<LanguageDistributionItem[]>('/trends/language-distribution').then((r) => r.data),

  dailyMisinformation: (days = 30) =>
    api.get<DailyMisinformationItem[]>('/trends/daily-misinformation', { params: { days } }).then((r) => r.data),

  dailyBreakdown: (days = 7) =>
    api.get<DailyBreakdownItem[]>('/trends/daily-breakdown', { params: { days } }).then((r) => r.data),
};
