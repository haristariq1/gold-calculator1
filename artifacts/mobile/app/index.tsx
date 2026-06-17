import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

const C = {
  TOLA_TO_GRAMS: 11.664,
  TOLA_TO_MASHA: 12,
  MASHA_TO_RATTI: 8,
  RATTI_TO_GRAMS: 0.1215,
};

type PriceUnit = "tola" | "gram";
type Currency = "PKR" | "USD" | "AED" | "SAR";

interface CalculationResult {
  gramsInput: number;
  mgInput: number;
  totalGrams: number;
  totalTola: number;
  totalMasha: number;
  totalRatti: number;
  totalValue: number | null;
  pricePerGram: number | null;
  pricePerTola: number | null;
  steps: string[];
}

function fmt(n: number, decimals = 3): string {
  if (n === 0) return "0";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

function fmtCurrency(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function computeWeights(gramsStr: string, mgStr: string) {
  const g = parseFloat(gramsStr) || 0;
  const mg = parseFloat(mgStr) || 0;
  const totalGrams = g + mg / 1000;
  const totalTola = totalGrams / C.TOLA_TO_GRAMS;
  const totalMasha = totalTola * C.TOLA_TO_MASHA;
  const totalRatti = totalMasha * C.MASHA_TO_RATTI;
  return { totalGrams, totalTola, totalMasha, totalRatti };
}

const CURRENCIES: Currency[] = ["PKR", "USD", "AED", "SAR"];

export default function GoldCalculator() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const styles = makeStyles(colors, isDark);

  const [grams, setGrams] = useState("");
  const [milligrams, setMilligrams] = useState("");
  const [goldPrice, setGoldPrice] = useState("");
  const [priceUnit, setPriceUnit] = useState<PriceUnit>("tola");
  const [currency, setCurrency] = useState<Currency>("PKR");
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [showSteps, setShowSteps] = useState(false);

  const hasInput = !!(grams || milligrams);

  // Live conversion (updates as user types)
  const live = useMemo(() => {
    if (!hasInput) return null;
    return computeWeights(grams, milligrams);
  }, [grams, milligrams, hasInput]);

  const calculate = useCallback(() => {
    if (!hasInput) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const gramsVal = parseFloat(grams) || 0;
    const mgVal = parseFloat(milligrams) || 0;
    const { totalGrams, totalTola, totalMasha, totalRatti } = computeWeights(grams, milligrams);

    const priceVal = parseFloat(goldPrice.replace(/,/g, "")) || 0;
    let totalValue: number | null = null;
    let pricePerGram: number | null = null;
    let pricePerTola: number | null = null;

    if (priceVal > 0) {
      if (priceUnit === "tola") {
        pricePerTola = priceVal;
        pricePerGram = priceVal / C.TOLA_TO_GRAMS;
        totalValue = totalTola * priceVal;
      } else {
        pricePerGram = priceVal;
        pricePerTola = priceVal * C.TOLA_TO_GRAMS;
        totalValue = totalGrams * priceVal;
      }
    }

    const steps: string[] = [];
    if (gramsVal > 0) steps.push(`Grams: ${fmt(gramsVal, 4)} g`);
    if (mgVal > 0) steps.push(`Milligrams: ${fmt(mgVal, 4)} mg ÷ 1000 = ${fmt(mgVal / 1000, 6)} g`);
    steps.push(`Total = ${fmt(totalGrams, 6)} g`);
    steps.push(`Tola = ${fmt(totalGrams, 6)} ÷ ${C.TOLA_TO_GRAMS} = ${fmt(totalTola, 6)}`);
    steps.push(`Masha = ${fmt(totalTola, 6)} × ${C.TOLA_TO_MASHA} = ${fmt(totalMasha, 6)}`);
    steps.push(`Ratti = ${fmt(totalMasha, 6)} × ${C.MASHA_TO_RATTI} = ${fmt(totalRatti, 6)}`);
    if (priceVal > 0 && totalValue !== null) {
      if (priceUnit === "tola") {
        steps.push(`Value = ${fmt(totalTola, 4)} Tola × ${fmtCurrency(priceVal)} ${currency} = ${fmtCurrency(totalValue)} ${currency}`);
      } else {
        steps.push(`Value = ${fmt(totalGrams, 4)} g × ${fmtCurrency(priceVal)} ${currency} = ${fmtCurrency(totalValue)} ${currency}`);
      }
    }

    setResult({ gramsInput: gramsVal, mgInput: mgVal, totalGrams, totalTola, totalMasha, totalRatti, totalValue, pricePerGram, pricePerTola, steps });
  }, [grams, milligrams, goldPrice, priceUnit, currency, hasInput]);

  const reset = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGrams("");
    setMilligrams("");
    setGoldPrice("");
    setResult(null);
    setShowSteps(false);
  }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Feather name="layers" size={22} color={colors.primary} />
            <Text style={styles.headerTitle}>Gold Calculator</Text>
          </View>
          {hasInput && (
            <TouchableOpacity onPress={reset} style={styles.resetBtn}>
              <Feather name="refresh-ccw" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        {/* Weight Input */}
        <Text style={styles.sectionLabel}>WEIGHT INPUT</Text>
        <View style={styles.card}>
          <WeightRow
            label="Grams"
            unit="g"
            value={grams}
            onChangeText={setGrams}
            colors={colors}
            styles={styles}
          />
          <View style={styles.divider} />
          <WeightRow
            label="Milligrams"
            unit="mg"
            value={milligrams}
            onChangeText={setMilligrams}
            colors={colors}
            styles={styles}
          />
        </View>

        {/* Live Conversion */}
        {live && live.totalGrams > 0 && (
          <View>
            <Text style={styles.sectionLabel}>LIVE CONVERSION</Text>
            <View style={[styles.card, styles.liveCard]}>
              <View style={styles.liveRow}>
                <Feather name="zap" size={13} color={colors.primary} style={{ marginTop: 1 }} />
                <Text style={styles.liveTitle}>Updates as you type</Text>
              </View>
              <View style={styles.liveGrid}>
                <LiveChip label="Tola" value={fmt(live.totalTola, 4)} colors={colors} styles={styles} isDark={isDark} highlight />
                <LiveChip label="Masha" value={fmt(live.totalMasha, 4)} colors={colors} styles={styles} isDark={isDark} />
                <LiveChip label="Ratti" value={fmt(live.totalRatti, 4)} colors={colors} styles={styles} isDark={isDark} />
              </View>
            </View>
          </View>
        )}

        {/* Gold Price */}
        <Text style={styles.sectionLabel}>GOLD PRICE (OPTIONAL)</Text>
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            {(["tola", "gram"] as PriceUnit[]).map((u) => (
              <TouchableOpacity
                key={u}
                style={[styles.toggleBtn, priceUnit === u && styles.toggleBtnActive]}
                onPress={() => { setPriceUnit(u); Haptics.selectionAsync(); }}
              >
                <Text style={[styles.toggleText, priceUnit === u && styles.toggleTextActive]}>
                  {u === "tola" ? "Per Tola" : "Per Gram"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.divider} />
          <View style={styles.priceRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.currencyRow}>
                {CURRENCIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.currencyBtn, currency === c && styles.currencyBtnActive]}
                    onPress={() => { setCurrency(c); Haptics.selectionAsync(); }}
                  >
                    <Text style={[styles.currencyText, currency === c && styles.currencyTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
          <View style={styles.priceInputRow}>
            <Text style={styles.currencyPrefix}>{currency}</Text>
            <TextInput
              style={styles.priceInput}
              value={goldPrice}
              onChangeText={setGoldPrice}
              placeholder="Enter price"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
              returnKeyType="done"
            />
          </View>
        </View>

        {/* Calculate Button */}
        <TouchableOpacity style={styles.calcBtn} onPress={calculate} activeOpacity={0.85}>
          <Feather name="hash" size={18} color={colors.primaryForeground} />
          <Text style={styles.calcBtnText}>Calculate</Text>
        </TouchableOpacity>

        {/* Results */}
        {result && (
          <ResultSection
            result={result}
            currency={currency}
            colors={colors}
            styles={styles}
            isDark={isDark}
            showSteps={showSteps}
            setShowSteps={setShowSteps}
          />
        )}

        {/* Conversion Reference */}
        <Text style={styles.sectionLabel}>CONVERSION REFERENCE</Text>
        <View style={styles.card}>
          {[
            ["1 Tola", "11.664 g"],
            ["1 Tola", "12 Masha"],
            ["1 Masha", "8 Ratti"],
            ["1 Ratti", "0.1215 g"],
            ["1000 mg", "1 g"],
          ].map(([from, to], i) => (
            <View key={i}>
              {i > 0 && <View style={styles.divider} />}
              <View style={styles.refRow}>
                <Text style={styles.refFrom}>{from}</Text>
                <Feather name="arrow-right" size={14} color={colors.mutedForeground} />
                <Text style={styles.refTo}>{to}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function WeightRow({ label, unit, value, onChangeText, colors, styles }: {
  label: string; unit: string; value: string;
  onChangeText: (t: string) => void;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.weightRow}>
      <View style={styles.weightLabelCol}>
        <Text style={styles.weightLabel}>{label}</Text>
        <Text style={styles.weightSublabel}>{unit}</Text>
      </View>
      <TextInput
        style={styles.weightInput}
        value={value}
        onChangeText={onChangeText}
        placeholder="0"
        placeholderTextColor={colors.mutedForeground}
        keyboardType="numeric"
        returnKeyType="done"
      />
    </View>
  );
}

function LiveChip({ label, value, colors, styles, isDark, highlight }: {
  label: string; value: string; highlight?: boolean;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof makeStyles>;
  isDark: boolean;
}) {
  return (
    <View style={[styles.liveChip, highlight && styles.liveChipHighlight]}>
      <Text style={[styles.liveChipValue, highlight && { color: colors.primary }]}>{value}</Text>
      <Text style={styles.liveChipLabel}>{label}</Text>
    </View>
  );
}

function ResultSection({ result, currency, colors, styles, isDark, showSteps, setShowSteps }: {
  result: CalculationResult; currency: Currency;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof makeStyles>;
  isDark: boolean;
  showSteps: boolean;
  setShowSteps: (v: boolean) => void;
}) {
  return (
    <View>
      <Text style={styles.sectionLabel}>RESULTS</Text>

      {/* Entered Weight */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Entered Weight</Text>
        <View style={styles.chipRow}>
          {result.gramsInput > 0 && (
            <View style={styles.inputChip}>
              <Text style={styles.inputChipNum}>{fmt(result.gramsInput, 4)}</Text>
              <Text style={styles.inputChipLabel}>grams</Text>
            </View>
          )}
          {result.mgInput > 0 && (
            <View style={styles.inputChip}>
              <Text style={styles.inputChipNum}>{fmt(result.mgInput, 4)}</Text>
              <Text style={styles.inputChipLabel}>mg</Text>
            </View>
          )}
          <View style={[styles.inputChip, styles.inputChipTotal]}>
            <Text style={[styles.inputChipNum, { color: colors.primary }]}>{fmt(result.totalGrams, 4)}</Text>
            <Text style={styles.inputChipLabel}>total g</Text>
          </View>
        </View>
      </View>

      {/* Converted Weight */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Converted Weight</Text>
        <ResultRow label="Tola" value={fmt(result.totalTola, 4)} highlight colors={colors} styles={styles} />
        <View style={styles.divider} />
        <ResultRow label="Masha" value={fmt(result.totalMasha, 4)} colors={colors} styles={styles} />
        <View style={styles.divider} />
        <ResultRow label="Ratti" value={fmt(result.totalRatti, 4)} colors={colors} styles={styles} />
      </View>

      {/* Gold Value */}
      {result.totalValue !== null && (
        <View style={styles.valueCard}>
          <Text style={styles.valueLabel}>Total Gold Value</Text>
          <Text style={styles.valueAmount}>
            {`${currency} ${fmtCurrency(result.totalValue)}`}
          </Text>
          {result.pricePerGram !== null && result.pricePerTola !== null && (
            <Text style={styles.valueMetaText}>
              {`${fmtCurrency(result.pricePerTola)} ${currency}/Tola  ·  ${fmt(result.pricePerGram, 2)} ${currency}/g`}
            </Text>
          )}
        </View>
      )}

      {/* Step-by-step */}
      <TouchableOpacity
        style={styles.stepsToggle}
        onPress={() => { setShowSteps(!showSteps); Haptics.selectionAsync(); }}
      >
        <Text style={styles.stepsToggleText}>Step-by-step breakdown</Text>
        <Feather name={showSteps ? "chevron-up" : "chevron-down"} size={16} color={colors.primary} />
      </TouchableOpacity>

      {showSteps && (
        <View style={styles.stepsCard}>
          {result.steps.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepDot} />
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function ResultRow({ label, value, highlight, colors, styles }: {
  label: string; value: string; highlight?: boolean;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.resultRow}>
      <Text style={[styles.resultLabel, highlight && { color: colors.primary }]}>{label}</Text>
      <Text style={[styles.resultValue, highlight && { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
        {value}
      </Text>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>, isDark: boolean) {
  const isWeb = Platform.OS === "web";
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: isDark ? "#0A0805" : "#F7F3EA" },
    scroll: { flex: 1 },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: isWeb ? 67 : 12,
      paddingBottom: isWeb ? 34 : 12,
    },

    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 24,
    },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
    headerTitle: { fontFamily: "Inter_700Bold", fontSize: 22, color: colors.foreground },
    resetBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: colors.muted,
      alignItems: "center", justifyContent: "center",
    },

    sectionLabel: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 11,
      color: colors.mutedForeground,
      letterSpacing: 1.2,
      marginBottom: 8,
      marginTop: 4,
    },

    card: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    liveCard: {
      borderColor: isDark ? "#4A3A10" : "#D4B060",
      borderWidth: 1.5,
    },
    cardTitle: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 13,
      color: colors.mutedForeground,
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 10,
    },

    divider: { height: 1, backgroundColor: colors.border },

    weightRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
    },
    weightLabelCol: { flex: 1, minWidth: 0 },
    weightLabel: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: colors.foreground },
    weightSublabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
    weightInput: {
      fontFamily: "Inter_500Medium",
      fontSize: 22,
      color: colors.foreground,
      textAlign: "right",
      width: 130,
      paddingVertical: 4,
      flexShrink: 0,
    },

    // Live conversion
    liveRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 },
    liveTitle: { fontFamily: "Inter_500Medium", fontSize: 12, color: colors.primary },
    liveGrid: { flexDirection: "row", paddingHorizontal: 12, paddingBottom: 14, gap: 8 },
    liveChip: {
      flex: 1,
      backgroundColor: isDark ? "#1C1608" : "#FAF3DC",
      borderRadius: 8,
      paddingVertical: 10,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    liveChipHighlight: {
      borderColor: colors.primary,
      backgroundColor: isDark ? "#2A1E05" : "#FFF4CC",
    },
    liveChipValue: {
      fontFamily: "Inter_700Bold",
      fontSize: 16,
      color: colors.foreground,
    },
    liveChipLabel: {
      fontFamily: "Inter_400Regular",
      fontSize: 11,
      color: colors.mutedForeground,
      marginTop: 3,
    },

    // Price section
    toggleRow: { flexDirection: "row", padding: 8, gap: 6 },
    toggleBtn: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: "center", backgroundColor: colors.muted },
    toggleBtnActive: { backgroundColor: colors.primary },
    toggleText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.mutedForeground },
    toggleTextActive: { color: colors.primaryForeground },
    priceRow: { paddingVertical: 8 },
    currencyRow: { flexDirection: "row", paddingHorizontal: 12, gap: 6 },
    currencyBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.muted },
    currencyBtnActive: {
      backgroundColor: isDark ? "#3A2E10" : "#F0E0A0",
      borderWidth: 1,
      borderColor: colors.primary,
    },
    currencyText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: colors.mutedForeground },
    currencyTextActive: { color: colors.primary },
    priceInputRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
    currencyPrefix: { fontFamily: "Inter_600SemiBold", fontSize: 18, color: colors.mutedForeground, marginRight: 10 },
    priceInput: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 22, color: colors.foreground },

    calcBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      paddingVertical: 16,
      marginBottom: 24,
    },
    calcBtnText: { fontFamily: "Inter_700Bold", fontSize: 17, color: colors.primaryForeground },

    // Result section
    chipRow: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, paddingBottom: 14, gap: 8 },
    inputChip: {
      backgroundColor: isDark ? "#2A2010" : "#F0E8D0",
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 8,
      alignItems: "center",
    },
    inputChipTotal: {
      backgroundColor: isDark ? "#2A1E05" : "#FFF4CC",
      borderWidth: 1,
      borderColor: isDark ? "#4A3A10" : "#D4B060",
    },
    inputChipNum: { fontFamily: "Inter_700Bold", fontSize: 18, color: colors.foreground },
    inputChipLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: colors.mutedForeground, marginTop: 2 },

    resultRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    resultLabel: { fontFamily: "Inter_400Regular", fontSize: 15, color: colors.foreground },
    resultValue: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: colors.foreground },

    valueCard: {
      backgroundColor: isDark ? "#1C1608" : "#FFF8E7",
      borderRadius: colors.radius,
      borderWidth: 1.5,
      borderColor: colors.primary,
      padding: 20,
      marginBottom: 12,
      alignItems: "center",
    },
    valueLabel: { fontFamily: "Inter_500Medium", fontSize: 13, color: colors.mutedForeground, marginBottom: 8 },
    valueAmount: { fontFamily: "Inter_700Bold", fontSize: 32, color: colors.primary },
    valueMetaText: { fontFamily: "Inter_400Regular", fontSize: 12, color: colors.mutedForeground, marginTop: 8 },

    stepsToggle: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 12,
      marginBottom: 4,
    },
    stepsToggleText: { fontFamily: "Inter_500Medium", fontSize: 14, color: colors.primary },
    stepsCard: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 16,
      gap: 10,
    },
    stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    stepDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginTop: 6 },
    stepText: { fontFamily: "Inter_400Regular", fontSize: 13, color: colors.foreground, flex: 1, lineHeight: 20 },

    refRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    refFrom: { fontFamily: "Inter_500Medium", fontSize: 14, color: colors.foreground, flex: 1 },
    refTo: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.primary, flex: 1, textAlign: "right" },
  });
}
