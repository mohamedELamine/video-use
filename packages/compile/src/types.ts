/**
 * Core types for video spec compilation and rendering
 */

export interface AlignedWord {
  id: string;
  text: string;
  start: number; // seconds
  end: number;
}

export interface Alignment {
  words: AlignedWord[];
  duration: number; // voice-over duration in seconds
}

export interface Anchor {
  id: string;
  role: 'payoff' | 'emphasis';
  wordId: string; // address to aligned word
}

export interface Cue {
  id: string;
  anchorId: string;
  kind: 'reveal' | 'state-change' | 'camera';
  target: string; // slot or element id
}

export interface Shot {
  id: string;
  beatId: string;
  startWordId: string; // first word of this shot
  intent: string; // e.g. 'statement', 'product-shot'
  surface?: 'base' | 'alt';
  slots: Record<string, unknown>; // intent-specific content
  cues?: Cue[];
  primaryAsset?: string; // path to asset file
}

export interface Beat {
  id: string;
  kind: string; // e.g. 'HOOK', 'PROBLEM', etc.
  startWordId: string;
  endWordId: string;
  shots: Shot[];
  anchors: Anchor[];
  claimedObligations?: string[]; // obligation ids this beat claims
}

export interface Plan {
  id: string;
  version: '1.0.0';
  archetype: string; // e.g. 'launch'
  beats: Beat[];
}

export interface BrandIdentity {
  name: string;
  displayType?: string;
  palette: Record<string, string>;
  roles: {
    required: string[];
    open: string[];
  };
  surfaces: {
    base: { bg: string; fg: string };
    alt?: { bg: string; fg: string };
  };
}

export interface ProductKnowledge {
  name: string;
  capabilities: Array<{
    id: string;
    name: string;
    description: string;
    evidenceModes: string[];
  }>;
}

export interface Finding {
  code: string;
  severity: 'error' | 'warning';
  entityId: string;
  message: string;
}

export interface CompiledPlan {
  valid: boolean;
  errors: Finding[];
  warnings: Finding[];
  grounding: Array<{
    capability: string;
    state: 'grounded' | 'unresolved' | 'contradicted';
  }>;
  timeline: TimelineFrame[];
  storyboard: string;
}

export interface TimelineFrame {
  shot: {
    id: string;
    beatId: string;
    intent: string;
  };
  startFrame: number;
  startSecond: number;
  endFrame: number;
  endSecond: number;
}

export interface IntentDefinition {
  id: string;
  name: string;
  description: string;
  slots: Array<{
    id: string;
    type: string;
    required: boolean;
    source: 'plan' | 'brand';
  }>;
  primaryAssetRule: 'required' | 'optional' | 'none';
  evidenceModes: string[];
}

export interface CueKindDefinition {
  id: string;
  name: string;
  description: string;
  targetTypes: string[];
}

export interface IntentVocabulary {
  version: string;
  intents: IntentDefinition[];
  cueKinds: CueKindDefinition[];
}

export interface RenderJob {
  product: {
    name: string;
    brand: BrandIdentity;
    knowledge: ProductKnowledge;
  };
  plan: Plan;
  alignment: Alignment;
  archetype: string;
  output: {
    tailS: number; // duration after voice-over ends
    fps: number;
    width: number;
    height: number;
  };
}

export interface Archetype {
  id: string;
  obligations: Array<{
    id: string;
    description: string;
    positional?: boolean; // true if order matters (e.g., 'early')
  }>;
  allowRepeat: Record<string, boolean>;
  orderingRules: string[];
}
