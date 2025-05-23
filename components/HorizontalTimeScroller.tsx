'use client';

import { useState, useEffect, useRef } from 'react';
import { formatInTimeZone } from 'date-fns-tz';
import { format, addDays, isSameDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { ClockIcon } from '@heroicons/react/24/outline';

interface Props {
  timeZones: string[];
  aiSuggestions: string[];
  selectedTimes: string[];
  onSelectTime: (times: string[]) => void;
  scrollToAISuggestionsRef: React.RefObject<HTMLDivElement>;
  scrollToConfirmationRef: React.RefObject<HTMLDivElement>;
}

export default function HorizontalTimeScroller({
  timeZones,
  aiSuggestions,
  selectedTimes,
  onSelectTime,
  scrollToAISuggestionsRef,
  scrollToConfirmationRef,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dateRibbonRef = useRef<HTMLDivElement | null>(null);
  const autoScrollRef = useRef<NodeJS.Timeout | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTimeISO, setSelectedTimeISO] = useState<string | null>(null);
  const [hoveredBlock, setHoveredBlock] = useState<number | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [suggestedTimes, setSuggestedTimes] = useState<string[]>([]);
  const [justSuggestedTimes, setJustSuggestedTimes] = useState<string[]>([]);

  const blocks = Array.from({ length: 96 }, (_, i) => i);
  const dateOptions = Array.from({ length: 365 }, (_, i) => addDays(new Date(), i));

  const scrollDateRibbon = (dir: number) => {
    if (dateRibbonRef.current) {
      dateRibbonRef.current.scrollBy({ left: dir * 150, behavior: 'smooth' });
    }
  };

  const startAutoScroll = (dir: number) => {
    stopAutoScroll();
    autoScrollRef.current = setInterval(() => scrollDateRibbon(dir), 100);
  };

  const stopAutoScroll = () => {
    if (autoScrollRef.current) clearInterval(autoScrollRef.current);
  };

  const handleAIButton = () => {
    onSelectTime([]);
    setSelectedTimeISO(null);

    const preferredStartHour = 8;
    const preferredEndHour = 20;
    const scoredTimes: { iso: string; score: number }[] = [];

    for (let block = 0; block < 96; block++) {
      const hour = Math.floor(block / 4);
      const minute = (block % 4) * 15;
      const utcDate = new Date(Date.UTC(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        hour,
        minute
      ));

      let awakeCount = 0;
      for (const tz of timeZones) {
        const localHour = parseInt(formatInTimeZone(utcDate, tz, 'H'), 10);
        if (localHour >= preferredStartHour && localHour < preferredEndHour) {
          awakeCount += 1;
        }
      }

      const awakeRatio = awakeCount / timeZones.length;
      if (awakeCount === timeZones.length) {
        scoredTimes.push({ iso: utcDate.toISOString(), score: awakeCount });
      }      
    }

    const sorted = scoredTimes.sort((a, b) => b.score - a.score);
    const topTimes = sorted.slice(0, 3).map((t) => t.iso);

    setSuggestedTimes(topTimes);
    setJustSuggestedTimes(topTimes);
    setShowTimeline(true);

    setTimeout(() => setJustSuggestedTimes([]), 1500);

    if (sorted.length > 0) {
      const topSuggestion = sorted[0].iso;
      setTimeout(() => {
        const cell = document.querySelector(`[data-time='${topSuggestion}']`) as HTMLElement | null;
        if (cell) {
          cell.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
      }, 100);
    }

    setTimeout(() => {
      scrollToAISuggestionsRef?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const isAISuggestion = (iso: string) => suggestedTimes.includes(iso);

  return (
    <div
      ref={scrollContainerRef}
      className="space-y-6 font-sans text-base md:text-xl overflow-y-auto"
    >
      <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
      <h2 className="text-xl font-bold text-gray-700 mb-4">Pick a Date</h2>

      <div className="relative">
        <div className="absolute left-0 top-0 h-full w-6 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 h-full w-6 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
        <div className="flex gap-6 overflow-x-auto scrollbar-hide pb-7 px-6 mt-9" ref={dateRibbonRef}>
          {dateOptions.map((date) => (
            <button
              key={date.toISOString()}
              onClick={() => setSelectedDate(date)}
              className={`px-4 py-2 rounded-full text-base font-medium whitespace-nowrap transition
                ${isSameDay(date, selectedDate)
                  ? 'bg-indigo-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:ring-1 hover:ring-indigo-300'
                }`}
            >
              {format(date, 'EEE dd MMM')}
            </button>
          ))}
        </div>
        <div className="absolute inset-y-0 left-0 right-0 flex justify-between items-center pointer-events-none z-20">
          <div
            onMouseEnter={() => startAutoScroll(-1)}
            onMouseLeave={stopAutoScroll}
            className="pointer-events-auto bg-white shadow-md rounded-full p-1"
          >
            ◀
          </div>
          <div
            onMouseEnter={() => startAutoScroll(1)}
            onMouseLeave={stopAutoScroll}
            className="pointer-events-auto bg-white shadow-md rounded-full p-1"
          >
            ▶
          </div>
        </div>
      </div>

      <motion.button
        type="button"
        onClick={handleAIButton}
        className="w-full bg-gradient-to-r from-indigo-500 via-blue-500 to-teal-400 
                   hover:from-indigo-600 hover:via-blue-600 hover:to-teal-500 
                   text-white text-lg font-semibold py-4 rounded-full transition mt-4 shadow-lg"
      >
        Find The Best Time With AI ✨
      </motion.button>

      {showTimeline && (
        <>
          <div ref={scrollToAISuggestionsRef} className="scroll-mt-24">
            <AnimatePresence>
              {selectedTimes.length === 0 && (
                <motion.div
                  key="helper"
                  initial={{ opacity: 0, scaleY: 0.95 }}
                  animate={{ opacity: 1, scaleY: 1 }}
                  exit={{ opacity: 0, scaleY: 0.95 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="w-full flex justify-center items-center origin-top pt-2 pb-2"
                >
                  <p className="text-lg text-indigo-600 text-center font-semibold bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-full shadow-md flex items-center gap-2 leading-normal">
                    Here's what AI found — Choose a time! ✨
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="overflow-x-auto" ref={containerRef}>
              <div className="inline-block min-w-[1000px]">
                <table className="table-auto w-full text-base text-gray-700 border-collapse">
                  <thead>
                    <tr>
                      <th colSpan={blocks.length + 1} className="text-center py-4 text-xl font-semibold text-gray-700 bg-white sticky top-0 z-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {timeZones.map((tz) => (
                      <tr key={tz}>
                        <td className="sticky left-0 z-10 bg-white px-4 py-3 font-medium text-gray-600 border-r border-gray-200 whitespace-nowrap">
                          {tz}
                        </td>
                        {blocks.map((i) => {
                          const hour = Math.floor(i / 4);
                          const minute = (i % 4) * 15;
                          const utcDate = new Date(Date.UTC(
                            selectedDate.getFullYear(),
                            selectedDate.getMonth(),
                            selectedDate.getDate(),
                            hour,
                            minute
                          ));
                          const isoTime = utcDate.toISOString();
                          const timeString = formatInTimeZone(utcDate, tz, 'HH:mm');
                          const isHovered = hoveredBlock === i;
                          const isSelected = selectedTimes.includes(isoTime);
                          const isSuggested = isAISuggestion(isoTime);

                          return (
                            <td
                              key={`${tz}-${i}`}
                              data-time={isoTime}
                              className={`relative min-w-[72px] px-5 py-3 text-base text-center border border-gray-100 cursor-pointer transition-colors duration-200 rounded-base
                                ${isHovered ? 'bg-indigo-50 hover:ring-2 ring-indigo-300' : ''}
                                ${isSuggested ? 'bg-gradient-to-br from-blue-100 to-indigo-100 font-medium' : ''}
                                ${isSelected ? 'bg-indigo-100 text-indigo-800 font-semibold ring-2 ring-indigo-400 shadow-sm' : ''}
                                hover:shadow-inner`}
                              onClick={() => {
                                if (selectedTimes.includes(isoTime)) {
                                  onSelectTime(selectedTimes.filter((t) => t !== isoTime));
                                } else {
                                  onSelectTime([...selectedTimes, isoTime]);
                                }
                              }}
                              onMouseEnter={() => setHoveredBlock(i)}
                              onMouseLeave={() => setHoveredBlock(null)}
                            >
                              <div className="relative flex items-center justify-center w-full h-full">
                                {timeString}
                                <AnimatePresence>
                                  {justSuggestedTimes.includes(isoTime) && (
                                    <motion.div
                                      key={isoTime}
                                      initial={{ width: '0%' }}
                                      animate={{ width: '100%' }}
                                      exit={{ opacity: 0 }}
                                      transition={{ duration: 0.7 }}
                                      className="absolute top-0 left-0 h-[3px] bg-indigo-400 rounded-t z-20"
                                    />
                                  )}
                                </AnimatePresence>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {selectedTimes.length > 0 && (
        <div ref={scrollToConfirmationRef} className="mt-6 space-y-4 scroll-mt-24">
          {selectedTimes.map((iso) => (
            <div
              key={iso}
              className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex justify-between items-start"
            >
              <div className="space-y-1 text-base text-gray-700">
                <h3 className="font-semibold mb-1 text-gray-800 text-base">
                  📌 Your Great Meet Time:
                </h3>
                {timeZones.map((tz) => (
                  <p key={tz} className="text-base">
                    {tz}: {formatInTimeZone(new Date(iso), tz, 'eee, MMM d, HH:mm')}
                  </p>
                ))}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setSelectedTimeISO(null);
                  onSelectTime(selectedTimes.filter((t) => t !== iso));
                  setTimeout(() => {
                    scrollToAISuggestionsRef?.current?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start',
                    });
                  }, 300);
                }}
                className="text-indigo-600 hover:text-white border border-indigo-300 hover:bg-indigo-500 transition-all duration-200 px-4 py-1.5 rounded-full font-semibold text-base shadow-sm"
              >
                Delete Time
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
