import React from 'react';
import {
  Train, MapPin, Clock, Gauge, Weight, Ruler, Zap, Users as UsersIcon,
  Calendar, Factory, Hash, ArrowLeft, Map, Layers,
  CheckCircle, XCircle, Wrench, FlaskConical, Archive
} from 'lucide-react';
import RouteMap from './RouteMap';

const STATUS_CONFIG = {
  'In Service': { color: '#22c55e', bg: 'bg-green-900/30', text: 'text-green-400', border: 'border-green-800/40', icon: CheckCircle },
  'Withdrawn': { color: '#ef4444', bg: 'bg-red-900/30', text: 'text-red-400', border: 'border-red-800/40', icon: XCircle },
  'Preserved': { color: '#a855f7', bg: 'bg-purple-900/30', text: 'text-purple-400', border: 'border-purple-800/40', icon: Archive },
  'Under Refurbishment': { color: '#f59e0b', bg: 'bg-amber-900/30', text: 'text-amber-400', border: 'border-amber-800/40', icon: Wrench },
  'Testing': { color: '#3b82f6', bg: 'bg-blue-900/30', text: 'text-blue-400', border: 'border-blue-800/40', icon: FlaskConical },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['In Service'];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text} border ${cfg.border}`} data-testid="train-status-badge">
      <Icon size={12} /> {status}
    </span>
  );
};

const SpecItem = ({ icon: Icon, label, value }) => {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-800/50 last:border-0">
      <Icon size={15} className="text-orange-500 flex-shrink-0" />
      <span className="text-gray-500 text-xs flex-shrink-0 w-28">{label}</span>
      <span className="text-gray-200 text-sm font-medium">{value}</span>
    </div>
  );
};

const TrainHeader = ({ train }) => (
  <div className="bg-[#1a1a1c] border border-gray-800 rounded-xl p-5 md:p-6 mb-4">
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
      <div>
        <h2 className="text-white text-xl md:text-2xl font-bold" data-testid="train-name">{train.name}</h2>
        {train.designation && <p className="text-gray-500 text-sm">{train.designation}</p>}
      </div>
      <StatusBadge status={train.status} />
    </div>
    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mb-4">
      <span className="flex items-center gap-1"><Factory size={12} /> {train.operator}</span>
      <span className="flex items-center gap-1"><MapPin size={12} /> {train.state}</span>
      <span className="flex items-center gap-1"><Train size={12} /> {train.train_type}</span>
    </div>
    {train.description && <p className="text-gray-300 text-sm leading-relaxed">{train.description}</p>}
  </div>
);

const SpecsPanel = ({ specs }) => (
  <div className="bg-[#1a1a1c] border border-gray-800 rounded-xl p-5 md:p-6 mb-4" data-testid="specs-panel">
    <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><Gauge size={16} className="text-orange-500" /> Quick Specs</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
      <SpecItem icon={Factory} label="Manufacturer" value={specs.manufacturer} />
      <SpecItem icon={Calendar} label="Introduced" value={specs.year_introduced} />
      {specs.year_retired && <SpecItem icon={Calendar} label="Retired" value={specs.year_retired} />}
      <SpecItem icon={Gauge} label="Top Speed" value={specs.top_speed_kmh ? `${specs.top_speed_kmh} km/h` : null} />
      <SpecItem icon={UsersIcon} label="Capacity" value={specs.capacity ? `${specs.capacity} pax` : null} />
      <SpecItem icon={Zap} label="Power Type" value={specs.power_type} />
      <SpecItem icon={Hash} label="Axle Config" value={specs.axle_config} />
      <SpecItem icon={Weight} label="Weight" value={specs.weight_tonnes ? `${specs.weight_tonnes}t` : null} />
      <SpecItem icon={Ruler} label="Length" value={specs.length_m ? `${specs.length_m}m` : null} />
      <SpecItem icon={Ruler} label="Gauge" value={specs.gauge_mm ? `${specs.gauge_mm}mm` : null} />
      <SpecItem icon={Zap} label="Power Output" value={specs.power_output_kw ? `${specs.power_output_kw} kW` : null} />
      <SpecItem icon={Hash} label="Number Built" value={specs.number_built} />
      <SpecItem icon={Train} label="Formation" value={specs.formation} />
      {specs.acceleration && <SpecItem icon={Gauge} label="Acceleration" value={specs.acceleration} />}
      {specs.braking_distance && <SpecItem icon={Gauge} label="Braking Dist." value={specs.braking_distance} />}
    </div>
  </div>
);

const LiverySection = ({ livery }) => (
  <div className="bg-[#1a1a1c] border border-gray-800 rounded-xl p-5 md:p-6 mb-4" data-testid="livery-section">
    <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><Layers size={16} className="text-orange-500" /> Livery</h3>
    <div className="space-y-3">
      {livery.map((l, i) => (
        <div key={i} className="flex items-start gap-3 p-3 bg-[#0f0f10] rounded-lg border border-gray-800/50">
          <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${l.is_current ? 'bg-green-500' : 'bg-gray-600'}`} />
          <div>
            <p className="text-white text-sm font-medium">{l.name} {l.is_current && <span className="text-green-400 text-xs ml-1">(Current)</span>}</p>
            <p className="text-gray-400 text-xs mt-0.5">{l.description}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const RoutesSection = ({ routes }) => (
  <div className="bg-[#1a1a1c] border border-gray-800 rounded-xl p-5 md:p-6 mb-4" data-testid="routes-section">
    <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><Map size={16} className="text-orange-500" /> Routes</h3>
    <RouteMap routes={routes} />
    <div className="mt-4 space-y-2">
      {routes.map((r, i) => (
        <div key={i} className="flex items-start gap-2 p-2.5 bg-[#0f0f10] rounded-lg border border-gray-800/50">
          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${r.is_current ? 'bg-green-500' : 'bg-gray-600'}`} />
          <div>
            <p className="text-white text-sm font-medium">{r.name} {!r.is_current && <span className="text-gray-500 text-xs ml-1">(Former)</span>}</p>
            <p className="text-gray-500 text-xs mt-0.5">{(r.stations || []).join(' \u2192 ')}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const HistorySection = ({ history }) => (
  <div className="bg-[#1a1a1c] border border-gray-800 rounded-xl p-5 md:p-6 mb-4" data-testid="history-section">
    <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><Clock size={16} className="text-orange-500" /> History</h3>
    <div className="relative pl-4 border-l-2 border-gray-800 space-y-4">
      {history.map((h, i) => (
        <div key={i} className="relative">
          <div className="absolute -left-[21px] w-3 h-3 rounded-full bg-[#e34c26] border-2 border-[#0f0f10]" />
          <p className="text-[#e34c26] text-xs font-bold mb-0.5">{h.year}</p>
          <p className="text-gray-300 text-sm">{h.event}</p>
        </div>
      ))}
    </div>
  </div>
);

const TrainDetail = ({ train, onBack }) => {
  const specs = train.specs || {};
  const routes = train.routes || [];
  const history = train.history || [];
  const livery = train.livery || [];

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-4 transition-colors" data-testid="back-to-list">
        <ArrowLeft size={16} /> Back to list
      </button>
      <TrainHeader train={train} />
      <SpecsPanel specs={specs} />
      {livery.length > 0 && <LiverySection livery={livery} />}
      {routes.length > 0 && <RoutesSection routes={routes} />}
      {history.length > 0 && <HistorySection history={history} />}
    </div>
  );
};

export { StatusBadge, STATUS_CONFIG };
export default TrainDetail;
