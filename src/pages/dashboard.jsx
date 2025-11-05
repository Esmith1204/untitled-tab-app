import BigLogo from "../../src/assets/untitled tab app logo.png";
import { useEffect, useState } from "react";

export default function Dashboard() {
    const [people, setPeople] = useState([]);
    const [newPerson, setNewPerson] = useState("");
    const [tip, setTip] = useState("0");

    const [presets, setPresets] = useState([]);
    const [presetName, setPresetName] = useState("");
    const [selectedPreset, setSelectedPreset] = useState("");

    const [lastTipApplied, setLastTipApplied] = useState(0);

    const addPerson = () => {
        const trimmed = newPerson.trim();
        if (trimmed && !people.find((p) => p.name === trimmed)) {
            setPeople([...people, { name: trimmed, amount: "0", paid: false }]);
            setNewPerson("");
        }
    };

    const removePerson = (name) => {
        setPeople((prev) => prev.filter((p) => p.name !== name));
    };

    const updateAmount = (index, value) => {
        setPeople((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], amount: value };
            return next;
        });
    };

    const togglePaid = (index) => {
        setPeople((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], paid: !next[index].paid };
            return next;
        });
    };

    const numericTip = parseFloat(tip) || 0;
    const total = people.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const grandTotal = total + numericTip;

    const startNewPreset = () => {
        setPeople([]);
        setPresetName("");
        setSelectedPreset("");
        setTip("0");
        setLastTipApplied(0);
    };

    const savePreset = () => {
        const name = presetName.trim();
        if (!name) return;
        const payload = { name, people: people.map((p) => ({ ...p })), tip };
        setPresets((prev) => {
            const exists = prev.some((ps) => ps.name === name);
            if (exists) return prev.map((ps) => (ps.name === name ? payload : ps));
            return [...prev, payload];
        });
        setSelectedPreset(name);
        setPresetName("");
        setLastTipApplied(0);
        // clear dashboard after save
        setPeople([]);
        setTip("0");
    };

    const loadPreset = (name) => {
        const ps = presets.find((p) => p.name === name);
        if (!ps) {
            setSelectedPreset("");
            setPeople([]);
            setTip("0");
            setLastTipApplied(0);
            return;
        }
        setPeople(ps.people.map((p) => ({ name: p.name, amount: String(p.amount), paid: !!p.paid })));
        setTip(ps.tip ?? "0");
        setSelectedPreset(name);
        setLastTipApplied(0);
    };

    const deletePreset = (name) => {
        if (!name) return;
        const ok = confirm(`Delete preset "${name}"? This cannot be undone.`);
        if (!ok) return;
        setPresets((prev) => prev.filter((p) => p.name !== name));
        if (selectedPreset === name) {
            setSelectedPreset("");
            setPeople([]);
            setTip("0");
            setLastTipApplied(0);
        }
    };

    // autosave active preset
    useEffect(() => {
        if (!selectedPreset) return;
        setPresets((prev) =>
            prev.map((ps) =>
                ps.name === selectedPreset ? { name: ps.name, people: people.map((p) => ({ ...p })), tip } : ps
            )
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [people, tip, selectedPreset]);

    const splitTipEvenly = () => {
        const parsedTip = parseFloat(tip) || 0;
        const delta = parsedTip - lastTipApplied;
        if (Math.abs(delta) < 1e-12) return;
        if (people.length === 0) return;
        const perPerson = delta / people.length;
        setPeople((prev) =>
            prev.map((p) => {
                const current = parseFloat(p.amount) || 0;
                return { ...p, amount: String(current + perPerson) };
            })
        );
        setLastTipApplied(parsedTip);
    };

    const onTipChange = (value) => {
        if (lastTipApplied !== 0 && people.length > 0) {
            const undoPerPerson = lastTipApplied / people.length;
            setPeople((prev) =>
                prev.map((p) => {
                    const cur = parseFloat(p.amount) || 0;
                    return { ...p, amount: String(cur - undoPerPerson) };
                })
            );
        }
        setTip(value);
        setLastTipApplied(0);
    };

    return (
        <div className="hero bg-base-200 min-h-screen p-6">
            <div className="hero-content flex flex-col gap-6 w-full max-w-2xl">

                {/* NAVBAR PLACEHOLDER */}
                <div className="w-full mb-2">
                    {/* If you have an actual navbar component, render it here.
              The logo will appear right under it. */}
                </div>

                {/* Inline logo placed between navbar and Presets */}
                <div className="flex justify-center mb-4">
                    <img src={BigLogo} alt="App logo" className="h-20 w-auto select-none drop-shadow-md" />
                </div>

                {/* Presets */}
                <fieldset className="fieldset w-full">
                    <legend className="fieldset-legend">Presets</legend>

                    {/* top row: select left, Clear and New buttons to the right */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1">
                            <select
                                className="select select-bordered w-full"
                                value={selectedPreset}
                                onChange={(e) => loadPreset(e.target.value)}
                            >
                                <option value="">Choose a preset to load</option>
                                {presets.map((ps, idx) => (
                                    <option key={idx} value={ps.name}>
                                        {ps.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex gap-2">
                            <button className="btn btn-sm" onClick={() => loadPreset("")}>
                                Clear
                            </button>
                            <button className="btn btn-sm" onClick={startNewPreset}>
                                New preset
                            </button>
                        </div>
                    </div>

                    {/* second row: preset name input + Save or Active + Delete */}
                    <div className="flex items-center gap-3 mt-3">
                        {!selectedPreset ? (
                            <>
                                <input
                                    type="text"
                                    className="input input-bordered w-full"
                                    placeholder="Preset name (save current people + tip)"
                                    value={presetName}
                                    onChange={(e) => setPresetName(e.target.value)}
                                />

                                <div className="flex gap-2">
                                    <button className="btn btn-primary" onClick={savePreset}>
                                        Save preset
                                    </button>
                                    <div className="w-28" />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex-1">
                                    <span className="font-medium">Active: {selectedPreset}</span>
                                </div>

                                <div className="flex gap-2">
                                    <button className="btn btn-error" onClick={() => deletePreset(selectedPreset)}>
                                        Delete preset
                                    </button>
                                    <div className="w-28" />
                                </div>
                            </>
                        )}
                    </div>
                </fieldset>

                {/* Add Person */}
                <fieldset className="fieldset w-full">
                    <legend className="fieldset-legend">Add a person</legend>
                    <div className="flex gap-2">
                        <input type="text" className="input input-bordered w-full" placeholder="Type name" value={newPerson} onChange={(e) => setNewPerson(e.target.value)} />
                        <button className="btn btn-primary" onClick={addPerson}>
                            Add
                        </button>
                    </div>
                </fieldset>

                {/* Payments */}
                <fieldset className="fieldset w-full">
                    <legend className="fieldset-legend">Payments</legend>
                    <div className="flex flex-col gap-4">
                        {people.length === 0 && <div className="text-sm text-muted-foreground">No people yet. Add a person to start splitting.</div>}

                        {people.map((p, i) => (
                            <div key={i} className="flex justify-between items-center gap-2">
                                <div className="flex items-center gap-3">
                                    <button className={`btn btn-ghost btn-sm btn-outline ${p.paid ? "bg-green-200 text-black" : ""}`} onClick={() => togglePaid(i)} title={p.paid ? "Mark as unpaid" : "Mark as paid"}>
                                        {p.paid ? "Paid" : "Mark"}
                                    </button>

                                    <span className={`font-bold ${p.paid ? "opacity-60 line-through" : ""}`}>{p.name}</span>
                                </div>

                                <input type="text" inputMode="decimal" pattern="[0-9]*" className="input input-sm w-24" value={p.amount} onChange={(e) => updateAmount(i, e.target.value)} disabled={p.paid} />

                                <button className="btn btn-sm btn-error" onClick={() => removePerson(p.name)}>
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                </fieldset>

                {/* Summary */}
                <fieldset className="fieldset w-full">
                    <legend className="fieldset-legend">Summary</legend>
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between">
                            <span>Total:</span>
                            <span>${total.toFixed(2)}</span>
                        </div>

                        {/* Tip row — input keeps its size, split button aligned to the right */}
                        <div className="flex items-center gap-2">
                            <span>Tip:</span>

                            <div className="w-24">
                                <input type="text" className="input input-sm w-full text-right" inputMode="decimal" value={tip} onChange={(e) => onTipChange(e.target.value)} />
                            </div>

                            <div className="ml-auto">
                                <button className="btn btn-sm" onClick={splitTipEvenly}>
                                    Split tip evenly
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-between font-bold">
                            <span>Grand Total:</span>
                            <span>${grandTotal.toFixed(2)}</span>
                        </div>
                    </div>
                </fieldset>
            </div>
        </div>
    );
}
