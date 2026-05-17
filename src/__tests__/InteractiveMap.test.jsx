import { render, screen } from '@testing-library/react';
import InteractiveMap from '../components/InteractiveMap';

jest.mock('leaflet/dist/leaflet.css', () => ({}));

jest.mock('leaflet', () => {
  const IconMock = jest.fn().mockImplementation((options) => options);

  IconMock.Default = {
    prototype: {
      _getIconUrl: jest.fn(),
    },
    mergeOptions: jest.fn(),
  };

  return {
    Icon: IconMock,
  };
});

jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ position }) => (
    <div data-testid="marker">
      {Array.isArray(position) ? position.join(',') : `${position.lat},${position.lng}`}
    </div>
  ),
  useMapEvents: jest.fn(() => ({
    flyTo: jest.fn(),
  })),
}));

test('renders map container and tile layer', () => {
  render(<InteractiveMap onLocationSelect={jest.fn()} />);

  expect(screen.getByTestId('map-container')).toBeInTheDocument();
  expect(screen.getByTestId('tile-layer')).toBeInTheDocument();
});

test('renders existing report markers', () => {
  render(
    <InteractiveMap
      onLocationSelect={jest.fn()}
      markers={[
        { id: 1, lat: -26.2, lng: 28.0, status: 'Submitted' },
        { id: 2, lat: -26.3, lng: 28.1, status: 'In Progress' },
        { id: 3, lat: -26.4, lng: 28.2, status: 'Resolved' },
      ]}
    />
  );

  expect(screen.getAllByTestId('marker')).toHaveLength(3);
});