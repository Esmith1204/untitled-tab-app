import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { loadPresetsForUsername, upsertPresetForUsername, deletePresetForUsername } from "../lib/presetsAPI";
import BigLogo from "../assets/untitled-tab-app-logo.png";

export default function Dashboard() {
  // session
  const [currentUsername, setCurrentUsername] = useState(localStorage.getItem("tabapp_username") || "");
  const [isSignedIn, setIsSignedIn] = useState(Boolean(localStorage.getItem("tabapp_username")));

  // presets
  const [presets, setPresets] = useState([]);
  const [selectedPreset, setSelectedPreset] = useState("");
  const [presetName, setPresetName] = useState("");

  // dashboard data
  const [people, setPeople] = useState([]);
  const [newPerson, setNewPerson] = useState("");
  const [tip, setTip] = useState("0");
  const [lastTipApplied, setLastTipApplied] = useState(0);

  // people ref to avoid stale closures
  const peopleRef = useRef(people);
  useEffect(() => { peopleRef.current = people; }, [people]);

  // load presets when username changes
  useEffect(() => {
    if (!currentUsername) {
      setPresets([]);
      setSelectedPreset("");
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const rows = await loadPresetsForUsername(currentUsername);
        if (!mounted) return;
        setPresets(rows.map(r => ({ id: r.id, name: r.name, data: r.data })));
      } catch (err) {
        console.error("loadPresets error", err);
      }
    })();
    return () => (mounted = false);
  }, [currentUsername]);

  // load preset into UI
  const loadPresetIntoDashboard = (name) => {
    setSelectedPreset(name);
    if (!name) {
      setPeople([]);
      setTip("0");
      setLastTipApplied(0);
      peopleRef.current = [];
      return;
    }
    const p = presets.find(x => x.name === name);
    if (!p) return;

    // ensure data is an object (handle stringified JSON just in case)
    const rawData = typeof p.data === 'string' ? (() => { try { return JSON.parse(p.data); } catch { return {}; } })() : (p.data || {});

    const loadedPeople = (rawData.people ?? []).map(pp => ({ id: pp.id || makeId(), ...pp }));
    setPeople(loadedPeople);
    peopleRef.current = loadedPeople;

    setTip(rawData.tip ?? "0");
    setLastTipApplied(0);
  };


  const handleSignIn = async (username) => {
    const trimmed = username.trim();
    if (!trimmed) return;

    // Clear local unsaved dashboard state immediately
    setPeople([]);
    setNewPerson("");
    setTip("0");
    setLastTipApplied(0);
    peopleRef.current = [];

    // Persist username locally and flip signed-in state
    localStorage.setItem("tabapp_username", trimmed);
    setCurrentUsername(trimmed);
    setIsSignedIn(true);

    // Load remote presets into UI (do NOT autosave local state)
    try {
      const rows = await loadPresetsForUsername(trimmed);
      setPresets(rows.map(r => ({ id: r.id, name: r.name, data: r.data })));
      setSelectedPreset("");
      setPresetName("");
    } catch (err) {
      console.error("load presets after sign-in failed", err);
      alert("Failed to load presets after sign-in — check console.");
    }
  };


  // sign out: do not save anything
  const handleSignOut = () => {
    localStorage.removeItem("tabapp_username");
    setCurrentUsername("");
    setIsSignedIn(false);

    // clear UI state
    setPresets([]);
    setSelectedPreset("");
    setPresetName("");
    setPeople([]);
    setNewPerson("");
    setTip("0");
    setLastTipApplied(0);

    // keep ref in sync
    peopleRef.current = [];
  };


  // manual save via Save preset button
  const handleManualSave = async () => {
    const name = (presetName || "").trim();
    if (!name) { alert("Enter a preset name"); return; }
    if (!currentUsername) { alert("You must be signed in to save a preset"); return; }

    try {
      const payload = { people: peopleRef.current, tip };
      console.log('ABOUT TO UPSERT', { username: currentUsername, name, payload });
      const created = await upsertPresetForUsername(currentUsername, name, payload);
      console.log('manual save result', created);
      const rows = await loadPresetsForUsername(currentUsername);
      setPresets(rows.map(r => ({ id: r.id, name: r.name, data: r.data })));
      setSelectedPreset(name);
      setPresetName("");
    } catch (err) {
      console.error('manual save failed', err);
      alert('Save failed — check console for details.');
    }
  };

  // delete preset
  const handleDeletePreset = async (name) => {
    if (!currentUsername || !name) return;
    await deletePresetForUsername(currentUsername, name);
    setPresets(prev => prev.filter(p => p.name !== name));
    if (selectedPreset === name) {
      setSelectedPreset("");
      setPeople([]);
      setTip("0");
      setLastTipApplied(0);
    }
  };

  // uses crypto.randomUUID() if available, otherwise fallback to timestamp
  const makeId = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now());

  const addPerson = async () => {
    const trimmed = newPerson.trim();
    if (!trimmed) return;

    const newEntry = { id: makeId(), name: trimmed, amount: "0", paid: false };
    const nextPeople = [...peopleRef.current, newEntry];

    setPeople(nextPeople);
    setNewPerson("");
    peopleRef.current = nextPeople;

    const targetPreset = selectedPreset || (presetName && presetName.trim()) || null;
    if (!isSignedIn || !currentUsername || !targetPreset) return;

    try {
      const payload = { people: nextPeople, tip };
      const created = await upsertPresetForUsername(currentUsername, targetPreset, payload);
      console.log('Add-person upsert result', created);
      const rows = await loadPresetsForUsername(currentUsername);
      setPresets(rows.map(r => ({ id: r.id, name: r.name, data: r.data })));
      if (!selectedPreset && presetName && presetName.trim()) {
        setSelectedPreset(targetPreset);
        setPresetName("");
      }
    } catch (err) {
      console.error('Failed to save preset after adding person', err);
    }
  };

  const removePerson = async (id) => {
    const nextPeople = people.filter(p => p.id !== id);
    setPeople(nextPeople);
    peopleRef.current = nextPeople;
    
    // Pass the updated people array directly to avoid race conditions
    await savePresetWithData(nextPeople, tip);
  };


  const updateAmount = async (id, value) => {
    const nextPeople = people.map(p => p.id === id ? { ...p, amount: value } : p);
    setPeople(nextPeople);
    peopleRef.current = nextPeople;
    
    // Pass the updated people array directly
    await savePresetWithData(nextPeople, tip);
  };

  const togglePaid = async (id) => {
    const nextPeople = people.map(p => p.id === id ? { ...p, paid: !p.paid } : p);
    setPeople(nextPeople);
    peopleRef.current = nextPeople;
    
    // Pass the updated people array directly to avoid race conditions
    await savePresetWithData(nextPeople, tip);
  };


  const numericTip = parseFloat(tip) || 0;
  const total = people.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const grandTotal = total + numericTip;

  const splitTipEvenly = async () => {
    const parsedTip = parseFloat(tip) || 0;
    const delta = parsedTip - lastTipApplied;
    if (Math.abs(delta) < 1e-12) return;
    if (people.length === 0) return;
    const perPerson = delta / people.length;
    const nextPeople = people.map(p => {
      const current = parseFloat(p.amount) || 0;
      return { ...p, amount: String(current + perPerson) };
    });
    setPeople(nextPeople);
    peopleRef.current = nextPeople;
    setLastTipApplied(parsedTip);
    
    // Save with the updated people array
    await savePresetWithData(nextPeople, tip);
  };

  const onTipChange = (value) => {
    if (lastTipApplied !== 0 && people.length > 0) {
      const undoPerPerson = lastTipApplied / people.length;
      const nextPeople = people.map(p => {
        const cur = parseFloat(p.amount) || 0;
        return { ...p, amount: String(cur - undoPerPerson) };
      });
      setPeople(nextPeople);
      peopleRef.current = nextPeople;
    }
    setTip(value);
    setLastTipApplied(0);
  };

  // NEW: Helper function that accepts the data directly to avoid race conditions
  const savePresetWithData = async (peopleData, tipData) => {
    const presetToSave = selectedPreset || (presetName && presetName.trim()) || null;
    if (!isSignedIn || !currentUsername || !presetToSave) return;

    try {
      const payload = { people: peopleData, tip: tipData };
      const created = await upsertPresetForUsername(currentUsername, presetToSave, payload);
      console.log('savePresetWithData upsert', created);
      const rows = await loadPresetsForUsername(currentUsername);
      setPresets(rows.map(r => ({ id: r.id, name: r.name, data: r.data })));
      if (!selectedPreset && presetName && presetName.trim()) {
        setSelectedPreset(presetToSave);
        setPresetName("");
      }
    } catch (err) {
      console.error('savePresetWithData error', err);
    }
  };

  // save current peopleRef.current + tip to DB if signed in and a preset target exists
  const savePresetIfNeeded = async (targetName = null) => {
    const presetToSave = selectedPreset || (targetName ? targetName.trim() : (presetName && presetName.trim())) || null;
    if (!isSignedIn || !currentUsername || !presetToSave) return;

    try {
      const payload = { people: peopleRef.current, tip };
      const created = await upsertPresetForUsername(currentUsername, presetToSave, payload);
      console.log('savePresetIfNeeded upsert', created);
      const rows = await loadPresetsForUsername(currentUsername);
      setPresets(rows.map(r => ({ id: r.id, name: r.name, data: r.data })));
      if (!selectedPreset && presetName && presetName.trim()) {
        setSelectedPreset(presetToSave);
        setPresetName("");
      }
    } catch (err) {
      console.error('savePresetIfNeeded error', err);
    }
  };


  return (
    <div className="hero bg-base-200 min-h-screen p-6">
      <div className="hero-content flex flex-col gap-6 w-full max-w-3xl">
        {/* Logo at the top center */}
        <div className="flex justify-center w-full mb-4">
          <img src={BigLogo} alt="logo" className="h-20 w-auto select-none" />
        </div>

        {/* Sign in section */}
        <div className="card bg-base-100 shadow-xl w-full">
          <div className="card-body">
            <h2 className="card-title">Account</h2>
            <div className="flex items-center gap-3">
              <input
                className="input input-bordered flex-1"
                placeholder="Enter username"
                value={currentUsername}
                onChange={(e) => setCurrentUsername(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSignIn(currentUsername); }}
              />
              <button className="btn btn-primary" onClick={() => handleSignIn(currentUsername)}>
                {isSignedIn ? "Switch User" : "Sign In"}
              </button>
              {isSignedIn && (
                <button className="btn btn-ghost" onClick={handleSignOut}>Sign Out</button>
              )}
            </div>
            <div className="text-sm text-base-content/60 mt-2">
              Status: <span className="font-semibold">{isSignedIn ? `Signed in as ${currentUsername}` : "Not signed in"}</span>
            </div>
          </div>
        </div>

        <fieldset className="fieldset w-full">
          <legend className="fieldset-legend">Presets</legend>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <select className="select select-bordered flex-1" value={selectedPreset} onChange={(e) => loadPresetIntoDashboard(e.target.value)}>
                <option value="">Choose a preset to load</option>
                {presets.map((ps) => <option key={ps.name} value={ps.name}>{ps.name}</option>)}
              </select>
              <button className="btn btn-outline" onClick={() => { setSelectedPreset(""); setPeople([]); setTip("0"); setPresetName(""); }}>Clear</button>
              <button className="btn btn-outline" onClick={() => { setPeople([]); setTip("0"); setSelectedPreset(""); setPresetName(""); }}>New Preset</button>
            </div>

            <div className="divider my-2"></div>

            <div className="flex items-center gap-3">
              <input 
                type="text" 
                className="input input-bordered flex-1" 
                placeholder="Enter preset name to save" 
                value={presetName} 
                onChange={(e) => setPresetName(e.target.value)} 
                onKeyDown={(e) => { if (e.key === "Enter") handleManualSave(); }} 
              />
              <button className="btn btn-primary" onClick={handleManualSave}>Save Preset</button>
              {selectedPreset && <button className="btn btn-error" onClick={() => handleDeletePreset(selectedPreset)}>Delete</button>}
            </div>
          </div>
        </fieldset>

        <fieldset className="fieldset w-full">
          <legend className="fieldset-legend">Add Person</legend>
          <div className="flex gap-3">
            <input 
              type="text" 
              className="input input-bordered flex-1" 
              placeholder="Enter person's name" 
              value={newPerson} 
              onChange={(e) => setNewPerson(e.target.value)} 
              onKeyDown={(e) => { if (e.key === "Enter") addPerson(); }} 
            />
            <button className="btn btn-primary" onClick={addPerson}>Add Person</button>
          </div>
        </fieldset>

        <fieldset className="fieldset w-full">
          <legend className="fieldset-legend">People & Payments</legend>
          <div className="flex flex-col gap-3">
            {people.length === 0 && (
              <div className="text-center py-8 text-base-content/60">
                No people added yet. Add a person above to start splitting bills.
              </div>
            )}
            {people.map((p) => (
              <div key={p.id} className="card bg-base-100 shadow-sm">
                <div className="card-body p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <button
                        className={`btn btn-sm ${p.paid ? "btn-success" : "btn-outline btn-ghost"}`}
                        onClick={() => togglePaid(p.id)}
                        title={p.paid ? "Mark as unpaid" : "Mark as paid"}
                      >
                        {p.paid ? "✓ Paid" : "Mark Paid"}
                      </button>
                      <span className={`text-lg font-semibold ${p.paid ? "opacity-50 line-through" : ""}`}>
                        {p.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">$</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          pattern="[0-9]*"
                          className="input input-bordered input-sm w-24 text-right"
                          value={p.amount}
                          onChange={(e) => updateAmount(p.id, e.target.value)}
                          disabled={p.paid}
                        />
                      </div>
                      <button className="btn btn-sm btn-error btn-outline" onClick={() => removePerson(p.id)}>
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </fieldset>

        <fieldset className="fieldset w-full">
          <legend className="fieldset-legend">Summary</legend>
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body">
              <div className="space-y-4">
                <div className="flex justify-between items-center text-lg">
                  <span className="font-medium">Subtotal:</span>
                  <span className="font-semibold">${total.toFixed(2)}</span>
                </div>
                
                <div className="divider my-2"></div>
                
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium text-lg">Tip:</span>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">$</span>
                      <input 
                        type="text" 
                        className="input input-bordered w-28 text-right" 
                        inputMode="decimal" 
                        value={tip} 
                        onChange={(e) => onTipChange(e.target.value)} 
                      />
                    </div>
                    <button className="btn btn-outline btn-sm" onClick={splitTipEvenly}>
                      Split Evenly
                    </button>
                  </div>
                </div>
                
                <div className="divider my-2"></div>
                
                <div className="flex justify-between items-center text-2xl">
                  <span className="font-bold">Grand Total:</span>
                  <span className="font-bold text-primary">${grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </fieldset>
      </div>
    </div>
  );
}