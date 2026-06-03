// @ts-nocheck
// PDF-Generation wird serverseitig mit @react-pdf/renderer durchgeführt
// Diese Datei wird dynamisch importiert, um TypeScript-Probleme zu vermeiden

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 12 },
  header: { marginBottom: 20, borderBottomWidth: 2, borderBottomColor: "#1e3a5f", paddingBottom: 10 },
  title: { fontSize: 24, fontWeight: "bold", color: "#1e3a5f" },
  subtitle: { fontSize: 14, color: "#666", marginTop: 5 },
  section: { marginVertical: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: "#1e3a5f", marginBottom: 8, borderBottomWidth: 1, borderBottomColor: "#ddd", paddingBottom: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", marginVertical: 3 },
  label: { fontWeight: "bold", color: "#333", width: "40%" },
  value: { color: "#333", width: "60%", textAlign: "right" },
  table: { marginVertical: 10 },
  tableHeader: { flexDirection: "row", backgroundColor: "#1e3a5f", padding: 8 },
  tableHeaderText: { color: "white", flex: 1, fontWeight: "bold" },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#ddd", padding: 8 },
  tableCell: { flex: 1, color: "#333" },
  tableCellWide: { flex: 2, color: "#333" },
  total: { marginTop: 15, paddingTop: 10, borderTopWidth: 2, borderTopColor: "#1e3a5f", flexDirection: "row", justifyContent: "space-between" },
  totalLabel: { fontSize: 16, fontWeight: "bold", color: "#1e3a5f" },
  totalValue: { fontSize: 16, fontWeight: "bold", color: "#1e3a5f" },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, fontSize: 10, color: "#999", textAlign: "center", borderTopWidth: 1, borderTopColor: "#ddd", paddingTop: 10 },
  checkbox: { marginVertical: 5, fontSize: 11 },
});

export function createOrderPDF({ order, resident, apartment, building, items }: any): any {
  const fullName = `${resident.salutation || ""} ${resident.title || ""} ${resident.firstName || ""} ${resident.lastName || ""}`.trim();

  const doc = (
    // @ts-ignore
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Bestellbestätigung</Text>
          <Text style={styles.subtitle}>Sonnenschutz – {building.street} {building.houseNumber}, {building.city}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bestelldaten</Text>
          <View style={styles.row}><Text style={styles.label}>Bestellnummer:</Text><Text style={styles.value}>{order.id}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Datum:</Text><Text style={styles.value}>{order.createdAt.toLocaleDateString("de-DE")}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Version:</Text><Text style={styles.value}>{order.version}</Text></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Eigentümer</Text>
          <View style={styles.row}><Text style={styles.label}>Name:</Text><Text style={styles.value}>{fullName || "—"}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Wohnung:</Text><Text style={styles.value}>{apartment.topNumber}, {apartment.floor}</Text></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bestellpositionen</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableCellWide}>Produkt</Text>
              <Text style={styles.tableCell}>Öffnung</Text>
              <Text style={styles.tableCell}>Menge</Text>
              <Text style={styles.tableCell}>Einzelpreis</Text>
              <Text style={styles.tableCell}>Gesamt</Text>
            </View>
            {items.map((item: any, idx: number) => (
              <View key={idx} style={styles.tableRow}>
                <Text style={styles.tableCellWide}>{item.productName}</Text>
                <Text style={styles.tableCell}>{item.windowNumber || "—"}</Text>
                <Text style={styles.tableCell}>{item.quantity}</Text>
                <Text style={styles.tableCell}>{item.unitPrice.toFixed(2)} €</Text>
                <Text style={styles.tableCell}>{item.totalPrice.toFixed(2)} €</Text>
              </View>
            ))}
          </View>
          <View style={styles.total}>
            <Text style={styles.totalLabel}>Gesamtsumme (netto):</Text>
            <Text style={styles.totalValue}>{order.totalNet.toFixed(2)} €</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bestätigung</Text>
          <Text style={styles.checkbox}>{order.privacyAccepted ? "☑ Datenschutzerklärung akzeptiert" : "☐ Nicht akzeptiert"}</Text>
          <Text style={styles.checkbox}>{order.termsAccepted ? "☑ AGB akzeptiert" : "☐ Nicht akzeptiert"}</Text>
          <Text style={styles.checkbox}>{order.withdrawalAccepted ? "☑ Widerrufsbelehrung zur Kenntnis genommen" : "☐ Nicht zur Kenntnis genommen"}</Text>
          <View style={styles.row}><Text style={styles.label}>Bestätigt von:</Text><Text style={styles.value}>{order.confirmationName || "—"}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Bestätigt am:</Text><Text style={styles.value}>{order.confirmedAt ? order.confirmedAt.toLocaleString("de-DE") : "—"}</Text></View>
          <View style={styles.row}><Text style={styles.label}>IP-Adresse:</Text><Text style={styles.value}>{order.confirmationIp || "—"}</Text></View>
        </View>

        <View style={styles.footer}>
          <Text>Dies ist eine rechtsverbindliche Bestellung. Die Bestellung wurde elektronisch übermittelt und archiviert.</Text>
        </View>
      </Page>
    </Document>
  );

  return doc;
}
