'use client';

import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler } from 'chart.js';
import { fmtPace } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import type { StravaActivity } from '@/types/strava';
import type { TrainingWeek } from '@/types/training-plan';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

const QUALITY_TYPES = new Set(['tempo', 'interval']);
const EASY_TYPES = new Set(['easy', 'recovery']);
const LONG_TYPES = new Set(['long_run']);

interface PaceTrendChartProps {
  activities: StravaActivity[];
  planWeeks?: TrainingWeek[];
  getMatchResult?: (wi: number, si: number, session: TrainingWeek['sessions'][0]) => { activity: StravaActivity; isManual: boolean } | null;
}

/**
 * Estimate "core" pace for quality sessions by removing ~1km warmup + ~1km cooldown.
 * If total distance <= 4km, use full average (too short to trim).
 * Core pace = (total_distance - 2km) / (total_time * (1 - 2km/total_distance))
 * This is a rough estimate; real split data would be more accurate.
 */
function estimateCorePace(activity: StravaActivity): number {
  const totalKm = activity.distance / 1000;
  if (totalKm <= 4) return 1000 / activity.average_speed / 60; // too short to trim

  // Assume warmup+cooldown pace is ~15% slower than average
  // Core km = total - 2km (1km warmup + 1km cooldown)
  // Core time = total_time - (2km * slower_pace)
  const avgPaceSec = 1000 / activity.average_speed; // s/km
  const warmCoolPace = avgPaceSec * 1.15; // ~15% slower
  const warmCoolTime = 2 * warmCoolPace; // 2km at slower pace
  const coreTime = activity.moving_time - warmCoolTime;
  const coreKm = totalKm - 2;

  if (coreTime <= 0 || coreKm <= 0) return 1000 / activity.average_speed / 60;
  return (coreTime / coreKm) / 60; // min/km
}

export function PaceTrendChart({ activities, planWeeks, getMatchResult }: PaceTrendChartProps) {
  // Build a map: activityId → plan session type
  const activityTypeMap = useMemo(() => {
    const map = new Map<number, string>();
    if (!planWeeks || !getMatchResult) return map;

    planWeeks.forEach((week, wi) => {
      week.sessions.forEach((s, si) => {
        if (s.type === 'rest') return;
        const match = getMatchResult(wi, si, s);
        if (match) {
          map.set(match.activity.id, s.type);
        }
      });
    });
    return map;
  }, [planWeeks, getMatchResult]);

  const hasPlanData = activityTypeMap.size > 0;

  const data = useMemo(() => {
    const sorted = [...activities]
      .filter(a => a.average_speed > 0)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

    const labels = sorted.map(a => new Date(a.start_date).toLocaleDateString('it', { day: '2-digit', month: 'short' }));

    if (hasPlanData) {
      // Plan-based classification
      const qualityPaces = sorted.map(a => {
        const type = activityTypeMap.get(a.id);
        if (type && QUALITY_TYPES.has(type)) return +estimateCorePace(a).toFixed(2);
        return null;
      });

      const easyPaces = sorted.map(a => {
        const type = activityTypeMap.get(a.id);
        if (type && EASY_TYPES.has(type)) return +(1000 / a.average_speed / 60).toFixed(2);
        // Unmatched activities: classify by pace fallback
        if (!type) {
          const pace = 1000 / a.average_speed / 60;
          return pace >= 5.5 ? +pace.toFixed(2) : null;
        }
        return null;
      });

      const longPaces = sorted.map(a => {
        const type = activityTypeMap.get(a.id);
        if (type && LONG_TYPES.has(type)) return +(1000 / a.average_speed / 60).toFixed(2);
        return null;
      });

      return {
        labels,
        datasets: [
          {
            label: 'Qualita (core pace)',
            data: qualityPaces,
            borderColor: 'rgba(255,77,0,0.9)',
            borderWidth: 2,
            fill: false,
            tension: 0.3,
            pointBackgroundColor: 'rgba(255,77,0,1)',
            pointRadius: 5,
            pointHoverRadius: 7,
            spanGaps: true,
          },
          {
            label: 'Easy',
            data: easyPaces,
            borderColor: 'rgba(57,211,83,0.6)',
            borderWidth: 1.5,
            fill: false,
            tension: 0.3,
            pointBackgroundColor: 'rgba(57,211,83,0.8)',
            pointRadius: 3,
            pointHoverRadius: 5,
            spanGaps: true,
          },
          {
            label: 'Long Run',
            data: longPaces,
            borderColor: 'rgba(157,78,221,0.7)',
            borderWidth: 1.5,
            fill: false,
            tension: 0.3,
            pointBackgroundColor: 'rgba(157,78,221,0.8)',
            pointRadius: 4,
            pointHoverRadius: 6,
            spanGaps: true,
          },
        ],
      };
    }

    // Fallback: pace-threshold classification (no plan data)
    const THRESHOLD = 5.5;
    return {
      labels,
      datasets: [
        {
          label: 'Qualita (<5:30)',
          data: sorted.map(a => { const p = 1000 / a.average_speed / 60; return p < THRESHOLD ? +p.toFixed(2) : null; }),
          borderColor: 'rgba(255,77,0,0.9)',
          borderWidth: 2,
          fill: false,
          tension: 0.3,
          pointBackgroundColor: 'rgba(255,77,0,1)',
          pointRadius: 4,
          pointHoverRadius: 6,
          spanGaps: true,
        },
        {
          label: 'Easy/Long (>5:30)',
          data: sorted.map(a => { const p = 1000 / a.average_speed / 60; return p >= THRESHOLD ? +p.toFixed(2) : null; }),
          borderColor: 'rgba(57,211,83,0.6)',
          borderWidth: 1.5,
          fill: false,
          tension: 0.3,
          pointBackgroundColor: 'rgba(57,211,83,0.8)',
          pointRadius: 3,
          pointHoverRadius: 5,
          spanGaps: true,
        },
      ],
    };
  }, [activities, hasPlanData, activityTypeMap]);

  return (
    <Card className="col-span-6 max-lg:col-span-12">
      <div className="font-display text-base tracking-wide mb-0.5">Trend ritmo</div>
      <div className="text-[0.72rem] text-muted mb-1">
        {hasPlanData ? (
          <>
            <span style={{ color: '#ff4d00' }}>&#9679;</span> qualita (core pace, no warmup/cooldown)
            <span className="mx-1.5">|</span>
            <span style={{ color: '#39d353' }}>&#9679;</span> easy
            <span className="mx-1.5">|</span>
            <span style={{ color: '#9d4edd' }}>&#9679;</span> long run
          </>
        ) : (
          <>
            <span style={{ color: '#ff4d00' }}>&#9679;</span> qualita (&lt;5:30)
            <span className="mx-2">|</span>
            <span style={{ color: '#39d353' }}>&#9679;</span> easy/long (&gt;5:30)
          </>
        )}
      </div>
      {hasPlanData && (
        <div className="text-[0.6rem] text-muted/50 mb-4">
          Classificazione dal piano · core pace stimato rimuovendo ~1km warmup + ~1km cooldown
        </div>
      )}
      {!hasPlanData && <div className="mb-4" />}
      <Line
        data={data}
        options={{
          responsive: true,
          animation: { duration: 600 },
          plugins: {
            legend: { display: false },
            datalabels: { display: false },
          },
          scales: {
            y: {
              reverse: true,
              ticks: { color: '#666', font: { size: 11, family: 'DM Mono' }, callback: (v) => fmtPace(Number(v) * 60) },
              grid: { color: 'rgba(255,255,255,0.04)' },
              border: { display: false },
            },
            x: {
              ticks: { color: '#555', font: { size: 10, family: 'DM Mono' }, maxTicksLimit: 8 },
              grid: { display: false },
              border: { display: false },
            },
          },
        }}
        height={220}
      />
    </Card>
  );
}
