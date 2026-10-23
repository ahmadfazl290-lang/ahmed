import curriculum from './curriculum.json' with {type:'json'};
import {hasValidPlacement} from './placement.js';
export const LEVEL_CATALOG=curriculum.levels;
export function parseLessonProgress(raw){
  try {
    const parsed=typeof raw==='string'?JSON.parse(raw):raw;
    if(!parsed?.completed||typeof parsed.completed!=='object'||Array.isArray(parsed.completed))return {completed:{}};
    return {completed:Object.fromEntries(Object.entries(parsed.completed).filter(([,value])=>typeof value==='string'&&Number.isFinite(Date.parse(value))))};
  }catch{return {completed:{}};}
}
export function assignedCurriculum(assessment){return hasValidPlacement(assessment)?LEVEL_CATALOG.find(level=>level.cefr===assessment.assignedLevel)||null:null;}
export function lessonPublished(lesson){return lesson?.status==='published'&&typeof lesson.text==='string'&&lesson.text.trim().length>0;}
export function mayCompleteLesson(assessment,lessonId){const level=assignedCurriculum(assessment);return !!level&&level.lessons.some(lesson=>lesson.id===lessonId&&lessonPublished(lesson));}
export function levelProgress(assessment,progress){const level=assignedCurriculum(assessment);if(!level)return {completed:0,published:0,total:0,percentage:0};const published=level.lessons.filter(lessonPublished);const completed=published.filter(lesson=>progress?.completed?.[lesson.id]).length;return {completed,published:published.length,total:level.lessons.length,percentage:published.length?Math.round(completed/published.length*100):0};}
