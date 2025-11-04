import { useState } from "react";

export default function Dashboard() {
    const [people, setPeople] = useState([]);
    const [newPerson, setNewPerson] = useState("");
    const [tip, setTip] = useState(0);

    // Presets: { name: string, people: [{name, amount, paid}], tip: number }
    const [presets, setPresets] = useState([]);
    const [presetName, setPresetName] = useState("");
    const [selectedPreset, setSelectedPreset] = useState("");

    const addPerson = () => {
        const trimmed = newPerson.trim();
        if (trimmed && !people.find((p) => p.name === trimmed)) {
            setPeople([...people, { name: trimmed, amount: "0", paid: false }]);
            setNewPerson("");
        }
    };

    const removePerson = (name) => {
        setPeople(people.filter((p) => p.name !== name));
    };

    const updateAmount = (index, value) => {
        const updated = [...people];
        updated[index].amount = value;
        setPeople(updated);
    };

    const togglePaid = (index) => {
        const updated = [...people];
        updated[index].paid = !updated[index].paid;
        setPeople(updated);
    };

    const total = people.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const grandTotal = total + tip;

    const savePreset = () => {
        const name = presetName.trim();
        if (!name) return;
        const payload = { name, people: people.map((p) => ({ ...p })), tip };
        if (presets.find((ps) => ps.name === name)) {
            setPresets(presets.map((ps) => (ps.name === name ? payload : ps)));
        } else {
            setPresets([...presets, payload]);
        }
        setPresetName("");
        setSelectedPreset(name);
    };

    const loadPreset = (name) => {
        const ps = presets.find((p) => p.name === name);
        if (!ps) return;
        setPeople(ps.people.map((p) => ({ name: p.name, amount: String(p.amount), paid: !!p.paid })));
        setTip(ps.tip);
        setSelectedPreset(name);
    };

    const deletePreset = (name) => {
        if (!name) return;
        const ok = confirm(`Delete preset "${name}"? This cannot be undone.`);
        if (!ok) return;
        setPresets(presets.filter((p) => p.name !== name));
        if (selectedPreset === name) {
            setSelectedPreset("");
        }
    };

    return (
        <div className="hero bg-base-200 min-h-screen p-6">
            <div className="hero-content flex flex-col gap-6 w-full max-w-2xl">

                {/* Presets */}
                <fieldset className="fieldset w-full">
                    <legend className="fieldset-legend">Presets</legend>
                    <div className="flex gap-2 items-center">
                        <select
                            className="select select-bordered w-full"
                            value={selectedPreset}
                            onChange={(e) => loadPreset(e.target.value)}
                        >
                            <option value="">Choose a preset to load</option>
                            {presets.map((ps, idx) => (
                                <option key={idx} value={ps.name}>{ps.name}</option>
                            ))}
                        </select>

                        <button
                            className="btn btn-sm"
                            onClick={() => {
                                setSelectedPreset("");
                            }}
                        >
                            Clear
                        </button>
                    </div>

                    <div className="flex gap-2 mt-3">
                        <input
                            type="text"
                            className="input input-bordered w-full"
                            placeholder="Preset name (save current people + tip)"
                            value={presetName}
                            onChange={(e) => setPresetName(e.target.value)}
                        />

                        <button
                            className="btn btn-primary"
                            onClick={savePreset}
                        >
                            Save preset
                        </button>

                        {selectedPreset ? (
                            <button
                                className="btn btn-error"
                                onClick={() => deletePreset(selectedPreset)}
                            >
                                Delete preset
                            </button>
                        ) : (
                            // maintain spacing when no selected preset
                            <div className="w-28" />
                        )}
                    </div>
                </fieldset>

                {/* Add Person */}
                <fieldset className="fieldset w-full">
                    <legend className="fieldset-legend">Add a person</legend>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            className="input input-bordered w-full"
                            placeholder="Type name"
                            value={newPerson}
                            onChange={(e) => setNewPerson(e.target.value)}
                        />
                        <button className="btn btn-primary" onClick={addPerson}>Add</button>
                    </div>
                </fieldset>

                {/* Dashboard */}
                <fieldset className="fieldset w-full">
                    <legend className="fieldset-legend">Dashboard</legend>
                    <div className="flex flex-col gap-4">
                        {people.length === 0 && (
                            <div className="text-sm text-muted-foreground">No people yet. Add a person to start splitting.</div>
                        )}
                        {people.map((p, i) => (
                            <div key={i} className="flex justify-between items-center gap-2">
                                <div className="flex items-center gap-3">
                                    <button
                                        className={`btn btn-ghost btn-sm ${p.paid ? "bg-green-200" : ""}`}
                                        onClick={() => togglePaid(i)}
                                        title={p.paid ? "Mark as unpaid" : "Mark as paid"}
                                    >
                                        {p.paid ? "Paid" : "Mark"}
                                    </button>

                                    <span className={`font-bold ${p.paid ? "opacity-60 line-through" : ""}`}>{p.name}</span>
                                </div>

                                <input
                                    type="text"
                                    inputMode="decimal"
                                    pattern="[0-9]*"
                                    className="input input-sm w-24"
                                    value={p.amount}
                                    onChange={(e) => updateAmount(i, e.target.value)}
                                    disabled={p.paid}
                                />

                                <button className="btn btn-sm btn-error" onClick={() => removePerson(p.name)}>Remove</button>
                            </div>
                        ))}
                    </div>
                </fieldset>

                {/* Totals */}
                <fieldset className="fieldset w-full">
                    <legend className="fieldset-legend">Summary</legend>
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between">
                            <span>Total:</span>
                            <span>${total.toFixed(2)}</span>
                        </div>

                        <div className="flex justify-between items-center gap-2">
                            <span>Tip:</span>
                            <input
                                type="number"
                                className="input input-sm w-24"
                                value={tip}
                                onChange={(e) => setTip(parseFloat(e.target.value) || 0)}
                            />
                            <button
                                className="btn btn-sm"
                                onClick={() => {
                                    if (people.length === 0) return;
                                    const per = tip / people.length;
                                    setPeople(people.map((p) => ({ ...p, amount: String((parseFloat(p.amount) || 0) + per) })));
                                }}
                            >
                                Split tip evenly
                            </button>
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

