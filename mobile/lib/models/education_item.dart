class EducationItem {
  const EducationItem({
    this.eduId,
    required this.school,
    this.schoolDomain,
    this.schoolLogo,
    this.schoolLogoAlt,
    required this.degree,
    this.fieldOfStudy,
    this.currentEducation = false,
    required this.startDate,
    this.endDate,
    this.grade,
    this.description,
    this.activity,
    this.refCode,
  });

  factory EducationItem.fromJson(Map<String, dynamic> json) {
    return EducationItem(
      eduId: json['eduId']?.toString().trim(),
      school: json['school']?.toString().trim() ?? '',
      schoolDomain: json['schoolDomain']?.toString().trim(),
      schoolLogo: json['schoolLogo']?.toString().trim(),
      schoolLogoAlt: json['schoolLogoAlt']?.toString().trim(),
      degree: json['degree']?.toString().trim() ?? '',
      fieldOfStudy: json['fieldOfStudy']?.toString().trim(),
      currentEducation: json['currentEducation'] == true,
      startDate: json['startDate']?.toString().trim() ?? '',
      endDate: json['endDate']?.toString().trim(),
      grade: json['grade']?.toString().trim(),
      description: json['description']?.toString().trim(),
      activity: json['activity']?.toString().trim(),
      refCode: json['refCode']?.toString().trim(),
    );
  }

  final String? eduId;
  final String school;
  final String? schoolDomain;
  final String? schoolLogo;
  final String? schoolLogoAlt;
  final String degree;
  final String? fieldOfStudy;
  final bool currentEducation;
  final String startDate;
  final String? endDate;
  final String? grade;
  final String? description;
  final String? activity;
  final String? refCode;

  Map<String, dynamic> toJson() {
    return {
      if (eduId != null && eduId!.trim().isNotEmpty) 'eduId': eduId!.trim(),
      'school': school.trim(),
      if (schoolDomain != null && schoolDomain!.trim().isNotEmpty)
        'schoolDomain': schoolDomain!.trim(),
      if (schoolLogo != null && schoolLogo!.trim().isNotEmpty) 'schoolLogo': schoolLogo!.trim(),
      if (schoolLogoAlt != null && schoolLogoAlt!.trim().isNotEmpty)
        'schoolLogoAlt': schoolLogoAlt!.trim(),
      'degree': degree.trim(),
      if (fieldOfStudy != null && fieldOfStudy!.trim().isNotEmpty)
        'fieldOfStudy': fieldOfStudy!.trim(),
      if (currentEducation) 'currentEducation': true,
      'startDate': startDate.trim(),
      if (!currentEducation && endDate != null && endDate!.trim().isNotEmpty)
        'endDate': endDate!.trim(),
      if (grade != null && grade!.trim().isNotEmpty) 'grade': grade!.trim(),
      if (description != null && description!.trim().isNotEmpty)
        'description': description!.trim(),
      if (activity != null && activity!.trim().isNotEmpty) 'activity': activity!.trim(),
      if (refCode != null && refCode!.trim().isNotEmpty) 'refCode': refCode!.trim(),
    };
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    if (other is! EducationItem) return false;
    return (eduId ?? '') == (other.eduId ?? '') &&
        school.trim() == other.school.trim() &&
        (schoolDomain ?? '') == (other.schoolDomain ?? '') &&
        (schoolLogo ?? '') == (other.schoolLogo ?? '') &&
        (schoolLogoAlt ?? '') == (other.schoolLogoAlt ?? '') &&
        degree.trim() == other.degree.trim() &&
        (fieldOfStudy ?? '') == (other.fieldOfStudy ?? '') &&
        currentEducation == other.currentEducation &&
        startDate.trim() == other.startDate.trim() &&
        (endDate ?? '') == (other.endDate ?? '') &&
        (grade ?? '') == (other.grade ?? '') &&
        (description ?? '') == (other.description ?? '') &&
        (activity ?? '') == (other.activity ?? '');
  }

  @override
  int get hashCode => Object.hash(
        eduId,
        school,
        schoolDomain,
        schoolLogo,
        degree,
        fieldOfStudy,
        currentEducation,
        startDate,
        endDate,
      );
}
