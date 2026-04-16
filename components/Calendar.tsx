'use client';

import { useState, useEffect } from 'react';
import { format, startOfISOWeek, addWeeks, subWeeks, getISOWeek, getISOWeekYear, addDays, isSameWeek } from 'date-fns';
import { it } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, LogOut, ThumbsUp, ThumbsDown, X } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, updateDoc, getDoc, runTransaction } from 'firebase/firestore';

interface CalendarProps {
  username: string;
  onLogout: () => void;
}

interface ShiftEntry {
  id: string;
  weekId: string;
  dayIndex: number;
  period: string;
  username: string;
  upvotes: number;
  downvotes: number;
  votes: Record<string, 'up' | 'down'>;
}

const PERIODS = [
  { id: 'morning', label: 'Mattina' },
  { id: 'afternoon', label: 'Pomeriggio' },
  { id: 'evening', label: 'Sera' }
];

export function Calendar({ username, onLogout }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState<ShiftEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const weekStart = startOfISOWeek(currentDate);
  const weekId = `${getISOWeekYear(currentDate)}-W${getISOWeek(currentDate).toString().padStart(2, '0')}`;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    const shiftsRef = collection(db, 'shifts');
    const q = query(shiftsRef, where('weekId', '==', weekId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newShifts: ShiftEntry[] = [];
      snapshot.forEach((doc) => {
        newShifts.push({ id: doc.id, ...doc.data() } as ShiftEntry);
      });
      setShifts(newShifts);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching shifts:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [weekId]);

  const handlePrevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const handleCurrentWeek = () => setCurrentDate(new Date());

  const handleAddShift = async (dayIndex: number, period: string) => {
    const shiftId = `${weekId}-${dayIndex}-${period}-${username}`;
    const shiftRef = doc(db, 'shifts', shiftId);
    
    try {
      await setDoc(shiftRef, {
        weekId,
        dayIndex,
        period,
        username,
        upvotes: 0,
        downvotes: 0,
        votes: {}
      });
    } catch (error) {
      console.error("Error adding shift:", error);
      alert("Errore durante l'aggiunta del turno.");
    }
  };

  const handleRemoveShift = async (shiftId: string) => {
    try {
      await deleteDoc(doc(db, 'shifts', shiftId));
    } catch (error) {
      console.error("Error removing shift:", error);
      alert("Errore durante la rimozione del turno.");
    }
  };

  const handleVote = async (shiftId: string, voteType: 'up' | 'down') => {
    const shiftRef = doc(db, 'shifts', shiftId);
    
    try {
      await runTransaction(db, async (transaction) => {
        const shiftDoc = await transaction.get(shiftRef);
        if (!shiftDoc.exists()) throw "Document does not exist!";
        
        const data = shiftDoc.data() as ShiftEntry;
        const currentVotes = data.votes || {};
        const previousVote = currentVotes[username];
        
        let newUpvotes = data.upvotes || 0;
        let newDownvotes = data.downvotes || 0;
        
        if (previousVote === voteType) {
          // Remove vote
          if (voteType === 'up') newUpvotes--;
          else newDownvotes--;
          delete currentVotes[username];
        } else {
          // Change or add vote
          if (previousVote === 'up') newUpvotes--;
          if (previousVote === 'down') newDownvotes--;
          
          if (voteType === 'up') newUpvotes++;
          else newDownvotes++;
          
          currentVotes[username] = voteType;
        }
        
        transaction.update(shiftRef, {
          upvotes: newUpvotes,
          downvotes: newDownvotes,
          votes: currentVotes
        });
      });
    } catch (error) {
      console.error("Error voting:", error);
      alert("Errore durante la votazione.");
    }
  };

  const days = Array.from({ length: 7 }).map((_, i) => {
    const date = addDays(weekStart, i);
    return {
      index: i,
      date,
      label: format(date, 'EEEE d', { locale: it })
    };
  });

  return (
    <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="bg-[#f5f5f0] border-b border-[#e6dfd1] p-4 sm:px-6 sm:py-4 flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 rounded-2xl">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div className="bg-[#e6dfd1] text-[#5a5a40] font-bold text-xs uppercase px-3 py-1 rounded-[20px]">
            {username}
          </div>
        </div>
        
        <div className="flex items-center justify-between w-full sm:w-auto gap-4">
          <button onClick={handlePrevWeek} className="text-[#5a5a40] opacity-50 hover:opacity-100 text-xl font-bold px-2 transition-opacity">
            ←
          </button>
          <div className="flex flex-col items-center">
            <span className="text-[18px] font-semibold text-[#2d2d2a]">
              Settimana {getISOWeek(currentDate)}
            </span>
            <span className="text-[11px] text-[#7a7a72] uppercase">
              {format(weekStart, 'MMMM yyyy', { locale: it })}
            </span>
          </div>
          <button onClick={handleNextWeek} className="text-[#5a5a40] opacity-50 hover:opacity-100 text-xl font-bold px-2 transition-opacity">
            →
          </button>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {!isSameWeek(currentDate, new Date()) && (
            <button 
              onClick={handleCurrentWeek}
              className="border border-[#5a5a40] text-[#5a5a40] uppercase text-[11px] font-semibold px-2.5 py-1 rounded hover:bg-[#e6dfd1] transition-colors"
            >
              Oggi
            </button>
          )}
          <button 
            onClick={onLogout}
            className="text-[#b56952] text-[11px] font-bold uppercase px-2 py-1 hover:bg-[#e6dfd1] rounded transition-colors flex items-center gap-1"
          >
            <LogOut className="w-3 h-3" /> Esci
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3 xl:gap-4">
        {days.map((day) => (
          <div key={day.index} className="bg-white rounded-[20px] p-3 xl:p-4 shadow-[0_4px_12px_rgba(0,0,0,0.05)] flex flex-col min-w-0">
            <div className="text-[13px] xl:text-[14px] font-bold text-[#5a5a40] uppercase mb-3 border-b border-[#f5f5f0] pb-2 truncate">
              {format(day.date, 'EEEE d MMM', { locale: it })}
            </div>
            
            <div className="flex-1 flex flex-col gap-4">
              {PERIODS.map((period) => {
                const periodShifts = shifts.filter(s => s.dayIndex === day.index && s.period === period.id);
                const isCurrentUserInShift = periodShifts.some(s => s.username === username);

                return (
                  <div key={period.id} className="flex flex-col sm:flex-row lg:flex-col gap-1.5 sm:gap-3 lg:gap-1.5 items-start">
                    <div className="text-[10px] xl:text-[11px] text-[#7a7a72] uppercase sm:mt-1 lg:mt-0 font-semibold w-[70px] shrink-0">
                      {period.label}
                    </div>
                    
                    <div className="flex flex-wrap gap-1.5 flex-1 w-full">
                      {periodShifts.map((shift) => (
                        <div key={shift.id} className={`flex items-center rounded-xl px-2 py-1 gap-1.5 w-full sm:w-auto lg:w-full xl:w-auto ${shift.username === username ? 'bg-[#e6dfd1]' : 'bg-[#f5f5f0]'}`}>
                          <span className="text-[11px] xl:text-[13px] font-semibold uppercase text-[#2d2d2a] truncate max-w-[70px] xl:max-w-[90px]" title={shift.username}>
                            {shift.username}
                          </span>
                          
                          {shift.username === username ? (
                            <button 
                              onClick={() => handleRemoveShift(shift.id)}
                              className="text-[#b56952] text-[14px] font-bold px-1 hover:opacity-70 ml-auto sm:ml-0 lg:ml-auto xl:ml-0"
                              title="Rimuovi il tuo turno"
                            >
                              ×
                            </button>
                          ) : (
                            <div className="flex items-center gap-1.5 ml-auto sm:ml-1 lg:ml-auto xl:ml-1">
                              <button 
                                onClick={() => handleVote(shift.id, 'up')}
                                className={`flex items-center gap-1 text-[11px] xl:text-[12px] transition-opacity ${shift.votes?.[username] === 'up' ? 'opacity-100 text-[#5a5a40] font-bold' : 'opacity-60 hover:opacity-100 text-[#7a7a72]'}`}
                              >
                                👍 {shift.upvotes || 0}
                              </button>
                              <button 
                                onClick={() => handleVote(shift.id, 'down')}
                                className={`flex items-center gap-1 text-[11px] xl:text-[12px] transition-opacity ${shift.votes?.[username] === 'down' ? 'opacity-100 text-[#b56952] font-bold' : 'opacity-60 hover:opacity-100 text-[#7a7a72]'}`}
                              >
                                👎 {shift.downvotes || 0}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {!isCurrentUserInShift && (
                        <button 
                          onClick={() => handleAddShift(day.index, period.id)}
                          className="border border-dashed border-[#7a7a72] text-[#7a7a72] px-2 py-1 rounded-xl text-[11px] xl:text-[12px] bg-transparent hover:bg-[#e6dfd1] transition-colors w-full sm:w-auto lg:w-full xl:w-auto text-center"
                        >
                          + Aggiungi
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
