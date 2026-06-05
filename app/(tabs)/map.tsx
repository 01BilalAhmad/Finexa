import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute } from '@/hooks/useRoute';
import { useShops } from '@/hooks/useShops';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { formatElapsed, formatPKRFull, formatTime } from '@/utils/format';

function generateMapHtml(route: any, stops: any[], waypoints: any[]): string {
  const center = route?.startLat
    ? [route.startLat, route.startLng]
    : [24.8607, 67.0105];

  const markers = stops.map((s, i) => ({
    lat: s.gpsLat || center[0] + (Math.random() - 0.5) * 0.02,
    lng: s.gpsLng || center[1] + (Math.random() - 0.5) * 0.02,
    label: `${i + 1}`,
    name: s.shopName,
    hasCheckout: !!s.checkOutTime,
    amount: s.recoveryAmount || 0,
  }));

  const markersJs = markers.map(m => `
    L.marker([${m.lat}, ${m.lng}], {
      icon: L.divIcon({
        html: '<div style="background:${m.hasCheckout ? '#22c55e' : '#3b82f6'};color:white;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:11px;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.4)">${m.label}</div>',
        className: '', iconSize: [26, 26], iconAnchor: [13, 13]
      })
    }).addTo(map).bindPopup('<b>${m.name}</b><br>PKR ${m.amount.toLocaleString()}');
  `).join('\n');

  // Draw full route polyline from waypoints (GPS trail)
  const waypointPoints = waypoints.map(wp => `[${wp.lat}, ${wp.lng}]`).join(',');
  const routePolylineJs = waypoints.length > 1
    ? `L.polyline([${waypointPoints}], {color:'#3b82f6', weight:4, opacity:0.8}).addTo(map);`
    : '';

  // Also draw stop-to-stop polyline
  const polylinePoints = markers.map(m => `[${m.lat}, ${m.lng}]`).join(',');
  const stopPolylineJs = markers.length > 1
    ? `L.polyline([${polylinePoints}], {color:'#3b82f6', weight:2, opacity:0.4, dashArray:'6,4'}).addTo(map);`
    : '';

  // Current position (pulsing dot) - last waypoint
  const lastWp = waypoints.length > 0 ? waypoints[waypoints.length - 1] : null;
  const currentPosJs = lastWp ? `
    L.marker([${lastWp.lat}, ${lastWp.lng}], {
      icon: L.divIcon({
        html: '<div style="width:16px;height:16px;border-radius:50%;background:#ef4444;border:3px solid white;box-shadow:0 0 0 2px #ef4444,0 2px 8px rgba(239,68,68,0.5);animation:pulse 2s infinite"></div>',
        className: '', iconSize: [16, 16], iconAnchor: [8, 8]
      })
    }).addTo(map).bindPopup('<b>Your Location</b>');
  ` : '';

  const startMarkerJs = `
    L.marker([${center[0]}, ${center[1]}], {
      icon: L.divIcon({
        html: '<div style="background:#22c55e;color:white;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.4)">S</div>',
        className: '', iconSize: [30, 30], iconAnchor: [15, 15]
      })
    }).addTo(map).bindPopup('<b>Route Start</b>');
  `;

  return `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
body,html,#map{margin:0;padding:0;height:100%;background:#070d1a}
@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(239,68,68,0.7)}70%{box-shadow:0 0 0 10px rgba(239,68,68,0)}100%{box-shadow:0 0 0 0 rgba(239,68,68,0)}}
</style>
</head><body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var map = L.map('map', {zoomControl:true}).setView([${center[0]}, ${center[1]}], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution:'&copy; OpenStreetMap', maxZoom:19
}).addTo(map);
${startMarkerJs}
${markersJs}
${routePolylineJs}
${stopPolylineJs}
${currentPosJs}
</script>
</body></html>`;
}

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { activeRoute, isRouteActive, elapsedSeconds, waypointCount, lastWaypoint } = useRoute();
  const { visitedShops, todayTotal } = useShops();
  const [webViewError, setWebViewError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const stops = activeRoute?.stops || [];
  const waypoints = activeRoute?.waypoints || [];

  useEffect(() => {
    if (isRouteActive) {
      const t = setInterval(() => setRefreshKey(k => k + 1), 10000);
      return () => clearInterval(t);
    }
  }, [isRouteActive]);

  // Refresh on new waypoint
  useEffect(() => {
    if (lastWaypoint) {
      setRefreshKey(k => k + 1);
    }
  }, [lastWaypoint?.timestamp]);

  if (!activeRoute) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>Route Map</Text>
        </View>
        <View style={styles.noRouteContainer}>
          <MaterialIcons name="map" size={64} color={Colors.textMuted} />
          <Text style={styles.noRouteTitle}>No Active Route</Text>
          <Text style={styles.noRouteSub}>Start a route from the Route tab to see live GPS tracking on the map.</Text>
        </View>
      </View>
    );
  }

  const mapHtml = generateMapHtml(activeRoute, stops, waypoints);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.headerBar}>
        <View style={styles.liveRow}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE TRACKING</Text>
        </View>
        <Text style={styles.headerTitle}>Route Map</Text>
        <Pressable onPress={() => setRefreshKey(k => k + 1)} style={styles.refreshBtn}>
          <MaterialIcons name="refresh" size={18} color={Colors.textSecondary} />
        </Pressable>
      </View>

      {/* Info Overlay */}
      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <MaterialIcons name="timer" size={14} color={Colors.textMuted} />
          <Text style={styles.infoText}>{formatElapsed(elapsedSeconds)}</Text>
        </View>
        <View style={styles.infoItem}>
          <MaterialIcons name="store" size={14} color={Colors.textMuted} />
          <Text style={styles.infoText}>{stops.length} stops</Text>
        </View>
        <View style={styles.infoItem}>
          <MaterialIcons name="gps-fixed" size={14} color={Colors.textMuted} />
          <Text style={styles.infoText}>{waypointCount} pts</Text>
        </View>
        <View style={styles.infoItem}>
          <MaterialIcons name="payments" size={14} color={Colors.success} />
          <Text style={[styles.infoText, { color: Colors.success }]}>{formatPKRFull(todayTotal)}</Text>
        </View>
      </View>

      {/* Map or Fallback */}
      {!webViewError && Platform.OS !== 'web' ? (
        <WebView
          key={refreshKey}
          source={{ html: mapHtml }}
          style={styles.map}
          onError={() => setWebViewError(true)}
          javaScriptEnabled
          domStorageEnabled
        />
      ) : (
        <ScrollView style={styles.fallback} contentContainerStyle={{ padding: Spacing.md }}>
          <View style={styles.fallbackHeader}>
            <MaterialIcons name="map" size={20} color={Colors.textSecondary} />
            <Text style={styles.fallbackTitle}>Route Info</Text>
          </View>
          <View style={styles.routeInfoCard}>
            <Text style={styles.routeInfoLabel}>Start Time</Text>
            <Text style={styles.routeInfoValue}>{formatTime(activeRoute.startTime)}</Text>
          </View>
          <View style={styles.routeInfoCard}>
            <Text style={styles.routeInfoLabel}>GPS Points</Text>
            <Text style={styles.routeInfoValue}>{waypointCount}</Text>
          </View>
          <View style={styles.routeInfoCard}>
            <Text style={styles.routeInfoLabel}>Total Stops</Text>
            <Text style={styles.routeInfoValue}>{stops.length}</Text>
          </View>
          <View style={styles.routeInfoCard}>
            <Text style={styles.routeInfoLabel}>Total Recovery</Text>
            <Text style={[styles.routeInfoValue, { color: Colors.success }]}>{formatPKRFull(todayTotal)}</Text>
          </View>
          {stops.map((s, i) => (
            <View key={i} style={styles.stopCard}>
              <View style={[styles.stopNum, { backgroundColor: s.checkOutTime ? Colors.successMuted : Colors.primaryMuted }]}>
                <Text style={[styles.stopNumText, { color: s.checkOutTime ? Colors.success : Colors.primary }]}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stopName}>{s.shopName}</Text>
                {s.checkInTime && <Text style={styles.stopTime}>{formatTime(s.checkInTime)}</Text>}
              </View>
              {s.recoveryAmount ? (
                <Text style={styles.stopAmount}>{formatPKRFull(s.recoveryAmount)}</Text>
              ) : null}
            </View>
          ))}
          {stops.length === 0 && (
            <View style={styles.center}>
              <Text style={styles.emptyText}>No stops recorded yet</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.success }]} />
          <Text style={styles.legendText}>Start</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} />
          <Text style={styles.legendText}>GPS Trail</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
          <Text style={styles.legendText}>Current</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  headerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.danger },
  liveText: { fontSize: 9, fontWeight: FontWeight.bold, color: Colors.danger, letterSpacing: 1 },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  refreshBtn: { padding: 4 },
  infoBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: Colors.surface, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  map: { flex: 1 },
  fallback: { flex: 1 },
  fallbackHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md },
  fallbackTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  routeInfoCard: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: Colors.border,
  },
  routeInfoLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  routeInfoValue: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  stopCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 10,
    marginBottom: 6, borderWidth: 1, borderColor: Colors.border,
  },
  stopNum: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stopNumText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  stopName: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textPrimary },
  stopTime: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 1 },
  stopAmount: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.success },
  legend: {
    flexDirection: 'row', justifyContent: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface, paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: FontSize.xs, color: Colors.textMuted },
  noRouteContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  noRouteTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textSecondary, marginTop: Spacing.md },
  noRouteSub: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  center: { alignItems: 'center', paddingVertical: Spacing.lg },
  emptyText: { fontSize: FontSize.sm, color: Colors.textMuted },
});
