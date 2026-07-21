export type PartCategory =
  | 'compute'
  | 'electronics'
  | 'plumbing'
  | 'power'
  | 'tools';

export interface Part {
  id: string;
  name: string;
  description: string;
  category: PartCategory;
  vendorUrl: string;
  priceEstimate: string;
  quantity: string;
  optional?: boolean;
}

export const categoryLabels: Record<PartCategory, string> = {
  compute: 'Computers & Displays',
  electronics: 'Electronics & Sensors',
  plumbing: 'Pumps, Valves & Plumbing',
  power: 'Power',
  tools: 'Tools',
};

export const parts: Part[] = [
  // ── Compute ────────────────────────────────────────────────
  {
    id: 'raspberry-pi-4',
    name: 'Raspberry Pi 4 (2GB or more)',
    description:
      'One runs the API hub, one drives the touchscreen. Any Pi 4 or Pi 5 works; 2GB RAM is plenty.',
    category: 'compute',
    vendorUrl: 'https://www.amazon.com/s?k=raspberry+pi+4+model+b',
    priceEstimate: '$45 each',
    quantity: '2',
  },
  {
    id: 'microsd-32gb',
    name: '32GB microSD card (A1 rated)',
    description:
      'Boot storage for each Pi. A1-rated cards handle the database writes far better than bargain cards.',
    category: 'compute',
    vendorUrl: 'https://www.amazon.com/s?k=sandisk+32gb+microsd+a1',
    priceEstimate: '$8 each',
    quantity: '2',
  },
  {
    id: 'usbc-power-supply',
    name: 'USB-C power supply (5V 3A)',
    description:
      'Official Raspberry Pi supplies are worth it — undervoltage causes mysterious crashes.',
    category: 'compute',
    vendorUrl: 'https://www.amazon.com/s?k=raspberry+pi+usb-c+power+supply',
    priceEstimate: '$10 each',
    quantity: '2',
  },
  {
    id: 'pi-touchscreen',
    name: 'Raspberry Pi 7" official touchscreen',
    description:
      'The control panel for your enclosure. Connects over the DSI ribbon cable — no HDMI needed.',
    category: 'compute',
    vendorUrl: 'https://www.amazon.com/s?k=raspberry+pi+7+inch+official+touchscreen',
    priceEstimate: '$75',
    quantity: '1',
  },
  {
    id: 'touchscreen-case',
    name: 'Touchscreen case / stand',
    description:
      'Holds the Pi and screen together as one unit. Skip it if you print our stand from the Downloads page.',
    category: 'compute',
    vendorUrl: 'https://www.amazon.com/s?k=raspberry+pi+7+touchscreen+case',
    priceEstimate: '$18',
    quantity: '1',
    optional: true,
  },

  // ── Electronics ────────────────────────────────────────────
  {
    id: 'relay-board-8ch',
    name: '8-channel 5V relay board',
    description:
      'The muscle of the system — each channel switches one pump or valve. Opto-isolated boards protect the Pi.',
    category: 'electronics',
    vendorUrl: 'https://www.amazon.com/s?k=8+channel+5v+relay+module+optocoupler',
    priceEstimate: '$12',
    quantity: '1',
  },
  {
    id: 'ds18b20-sensor',
    name: 'DS18B20 waterproof temperature sensor',
    description:
      'Reliable 1-Wire temperature probe. Get the stainless-steel waterproof version with a long lead.',
    category: 'electronics',
    vendorUrl: 'https://www.amazon.com/s?k=ds18b20+waterproof+temperature+sensor',
    priceEstimate: '$10',
    quantity: '1',
  },
  {
    id: 'resistor-4k7',
    name: '4.7kΩ resistor',
    description:
      'Pull-up resistor required on the DS18B20 data line. Usually cheapest as part of an assortment kit.',
    category: 'electronics',
    vendorUrl: 'https://www.amazon.com/s?k=resistor+assortment+kit',
    priceEstimate: '$6 (kit)',
    quantity: '1',
  },
  {
    id: 'jumper-wires',
    name: 'Jumper wires (female-female)',
    description:
      'Connect the Pi GPIO header to the relay board and sensors. A 40-pack lasts forever.',
    category: 'electronics',
    vendorUrl: 'https://www.amazon.com/s?k=female+female+jumper+wires',
    priceEstimate: '$6',
    quantity: '1 pack',
  },
  {
    id: 'cable-glands',
    name: 'Waterproof cable glands',
    description:
      'Pass wires through enclosure walls without letting water follow them. PG7 fits most sensor cables.',
    category: 'electronics',
    vendorUrl: 'https://www.amazon.com/s?k=pg7+waterproof+cable+glands',
    priceEstimate: '$8',
    quantity: '1 pack',
    optional: true,
  },

  // ── Plumbing ───────────────────────────────────────────────
  {
    id: 'peristaltic-pump',
    name: '12V peristaltic dosing pump',
    description:
      'Precise, self-priming, and the liquid only ever touches the tubing. Used for dosing and topping off.',
    category: 'plumbing',
    vendorUrl: 'https://www.amazon.com/s?k=12v+peristaltic+dosing+pump',
    priceEstimate: '$14 each',
    quantity: '2',
  },
  {
    id: 'solenoid-valve',
    name: '12V solenoid valve (normally closed)',
    description:
      'Controls drain and fill lines for automated water changes. Normally-closed means power loss = water stays put.',
    category: 'plumbing',
    vendorUrl: 'https://www.amazon.com/s?k=12v+solenoid+valve+normally+closed+water',
    priceEstimate: '$11 each',
    quantity: '2',
  },
  {
    id: 'return-pump',
    name: 'Submersible return pump (200–400 GPH)',
    description:
      'Moves water from the sump back to the enclosure. Size to roughly 5× your tank volume per hour.',
    category: 'plumbing',
    vendorUrl: 'https://www.amazon.com/s?k=submersible+aquarium+pump+300+gph',
    priceEstimate: '$20',
    quantity: '1',
  },
  {
    id: 'tubing',
    name: 'Silicone airline & vinyl tubing',
    description:
      'Silicone for the peristaltic pumps, vinyl for drain/fill lines. Check your pump and valve barb sizes.',
    category: 'plumbing',
    vendorUrl: 'https://www.amazon.com/s?k=silicone+airline+tubing+aquarium',
    priceEstimate: '$10',
    quantity: 'as needed',
  },
  {
    id: 'check-valves',
    name: 'Check valves',
    description:
      'One-way valves that stop back-siphoning — cheap insurance against a flooded floor.',
    category: 'plumbing',
    vendorUrl: 'https://www.amazon.com/s?k=aquarium+check+valve',
    priceEstimate: '$7',
    quantity: '1 pack',
  },
  {
    id: 'sump-container',
    name: 'Sump / reservoir container',
    description:
      'Any food-safe bin works as a water-change reservoir. Size it to at least 20% of your enclosure volume.',
    category: 'plumbing',
    vendorUrl: 'https://www.amazon.com/s?k=food+grade+storage+container+5+gallon',
    priceEstimate: '$15',
    quantity: '1',
  },

  // ── Power ──────────────────────────────────────────────────
  {
    id: 'psu-12v',
    name: '12V 5A power supply',
    description:
      'Powers all pumps and valves through the relay board. 5A leaves comfortable headroom.',
    category: 'power',
    vendorUrl: 'https://www.amazon.com/s?k=12v+5a+power+supply+adapter',
    priceEstimate: '$14',
    quantity: '1',
  },
  {
    id: 'barrel-splitters',
    name: 'DC barrel jack splitters & pigtails',
    description:
      'Distribute 12V to multiple pumps and valves without soldering.',
    category: 'power',
    vendorUrl: 'https://www.amazon.com/s?k=dc+barrel+jack+splitter+pigtail',
    priceEstimate: '$8',
    quantity: '1 pack',
  },
  {
    id: 'inline-fuses',
    name: 'Inline fuse holders (with fuses)',
    description:
      'A fuse on the 12V line protects the wiring if a pump ever jams or shorts.',
    category: 'power',
    vendorUrl: 'https://www.amazon.com/s?k=inline+fuse+holder+kit+12v',
    priceEstimate: '$9',
    quantity: '1 pack',
    optional: true,
  },

  // ── Tools ──────────────────────────────────────────────────
  {
    id: 'wire-strippers',
    name: 'Wire strippers',
    description: 'For trimming pump and valve leads to length.',
    category: 'tools',
    vendorUrl: 'https://www.amazon.com/s?k=wire+strippers',
    priceEstimate: '$12',
    quantity: '1',
    optional: true,
  },
  {
    id: 'screwdriver-set',
    name: 'Small screwdriver set',
    description: 'Relay board terminals take a small flathead.',
    category: 'tools',
    vendorUrl: 'https://www.amazon.com/s?k=precision+screwdriver+set',
    priceEstimate: '$10',
    quantity: '1',
    optional: true,
  },
  {
    id: 'drill-step-bit',
    name: 'Drill with step bit',
    description:
      'For drilling clean bulkhead and cable-gland holes in the sump container.',
    category: 'tools',
    vendorUrl: 'https://www.amazon.com/s?k=step+drill+bit+set',
    priceEstimate: '$15',
    quantity: '1',
    optional: true,
  },
];

export function partById(id: string): Part {
  const part = parts.find((p) => p.id === id);
  if (!part) throw new Error(`Unknown part id: ${id}`);
  return part;
}
