'use client';
import {createContext,useContext} from 'react';
export type LearningIdentity = {kind:'guest'} | {kind:'account';subject:string};
// An omitted provider means public learning only, never an authenticated account.
export const LearningIdentityContext=createContext<LearningIdentity>({kind:'guest'});
export const useLearningIdentity=()=>useContext(LearningIdentityContext);
