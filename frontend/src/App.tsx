/** App shell + routes (SDD §12.2). Phase 1 implements screens. */
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import BasinMap from './screens/BasinMap';
import CommandCenter from './screens/CommandCenter';
import WcrViewer from './screens/WcrViewer';
import PresenterConsole from './screens/PresenterConsole';
import DemoGuidePage from './components/guide/DemoGuide';
import Problem from './screens/Problem';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Problem />} />
        <Route path="/problem" element={<Problem />} />
        <Route path="/map" element={<BasinMap />} />
        <Route path="/well/:wellId" element={<CommandCenter />} />
        <Route path="/wcr/:docId" element={<WcrViewer />} />
        <Route path="/presenter" element={<PresenterConsole />} />
        <Route path="/guide" element={<DemoGuidePage />} />
      </Routes>
    </BrowserRouter>
  );
}
