export interface StlModel {
  id: string;
  name: string;
  description: string;
  file: string;
  material: string;
  infill: string;
  supports: boolean;
  printTime: string;
}

export const stlModels: StlModel[] = [
  {
    id: 'hub-case',
    name: 'Hub Case',
    description:
      'Enclosure for the hub Pi with ventilation slots, GPIO cable pass-through, and screw bosses for wall mounting.',
    file: '/stl/hub-case.stl',
    material: 'PETG',
    infill: '25%',
    supports: false,
    printTime: '~6 h',
  },
  {
    id: 'relay-mount',
    name: 'Relay Board Mount',
    description:
      'Snap-in tray for the 8-channel relay board with strain-relief hooks for the 12V wiring.',
    file: '/stl/relay-mount.stl',
    material: 'PETG',
    infill: '20%',
    supports: false,
    printTime: '~2.5 h',
  },
  {
    id: 'touchscreen-stand',
    name: 'Touchscreen Stand',
    description:
      'Desk stand for the official 7" touchscreen at a comfortable 30° viewing angle, with a cable channel.',
    file: '/stl/touchscreen-stand.stl',
    material: 'PLA',
    infill: '20%',
    supports: true,
    printTime: '~5 h',
  },
  {
    id: 'sensor-probe-holder',
    name: 'Sensor Probe Holder',
    description:
      'Clips a DS18B20 probe to rimmed or rimless tank walls up to 15mm thick, keeping the tip fully submerged.',
    file: '/stl/sensor-probe-holder.stl',
    material: 'PETG',
    infill: '30%',
    supports: false,
    printTime: '~45 min',
  },
  {
    id: 'dosing-pump-bracket',
    name: 'Dosing Pump Bracket',
    description:
      'Stackable bracket holding two peristaltic pumps above your reservoir, with tubing guides.',
    file: '/stl/dosing-pump-bracket.stl',
    material: 'PETG',
    infill: '30%',
    supports: false,
    printTime: '~3 h',
  },
  {
    id: 'cable-comb',
    name: 'Cable Comb',
    description:
      'Organizes sensor leads and 12V runs along the back of the enclosure. Print as many as you need.',
    file: '/stl/cable-comb.stl',
    material: 'PLA',
    infill: '15%',
    supports: false,
    printTime: '~20 min',
  },
];
