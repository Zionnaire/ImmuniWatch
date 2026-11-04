import { createContext, use } from 'react';

const ViewerModeContext = createContext(false);

export function useViewerMode() { return use(ViewerModeContext); }

export default ViewerModeContext;
